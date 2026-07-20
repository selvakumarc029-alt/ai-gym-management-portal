package com.aigym.portal.controller;

import com.aigym.portal.service.GymDataStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin
public class ApiController {
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("hh:mm a", Locale.forLanguageTag("en-IN"));
    private final GymDataStore store;

    public ApiController(GymDataStore store) {
        this.store = store;
    }

    @GetMapping("/state")
    public JsonNode state() {
        return store.state();
    }

    @PostMapping("/state")
    public Map<String, Boolean> saveState(@RequestBody JsonNode state) {
        if (!state.isObject()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "State must be a JSON object");
        store.replaceState(state);
        return Map.of("ok", true);
    }

    @PostMapping("/login")
    public JsonNode login(@RequestBody JsonNode body) {
        String email = body.path("email").asText("").trim().toLowerCase();
        String password = body.path("password").asText("");
        ObjectNode db = store.read();
        for (JsonNode user : db.withArray("users")) {
            if (email.equals(user.path("email").asText()) && password.equals(user.path("password").asText())) {
                String token = UUID.randomUUID().toString().replace("-", "");
                ObjectNode session = db.with("sessions").putObject(token);
                session.put("email", email).put("role", user.path("role").asText()).put("createdAt", ZonedDateTime.now(INDIA).toString());
                store.write(db);
                ObjectNode response = db.objectNode();
                response.put("token", token);
                response.put("email", email);
                response.put("role", user.path("role").asText());
                response.put("name", user.path("name").asText());
                response.put("redirect", user.path("redirect").asText());
                return response;
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
    }

    @PostMapping("/register")
    public ResponseEntity<JsonNode> register(@RequestBody JsonNode body) {
        String name = body.path("name").asText("").trim();
        String email = body.path("email").asText("").trim().toLowerCase();
        String password = body.path("password").asText("");
        if (name.isBlank() || email.isBlank() || password.length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter name, email, and a password with at least 4 characters.");
        }

        ObjectNode db = store.read();
        for (JsonNode user : db.withArray("users")) {
            if (email.equals(user.path("email").asText())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already registered.");
            }
        }

        ObjectNode state = (ObjectNode) db.path("state");
        ArrayNode members = state.withArray("members");
        String memberId = nextId(members, "M");
        db.withArray("users").addObject().put("email", email).put("password", password).put("role", "member").put("name", name).put("redirect", "member-dashboard.html");
        String trainerId = state.withArray("trainers").isEmpty() ? "" : state.withArray("trainers").get(0).path("id").asText();
        members.addObject().put("id", memberId).put("name", name).put("email", email).put("trainerId", trainerId)
            .put("plan", "Basic").put("status", "Trial").put("attendance", 0).put("progress", 0)
            .put("membershipStart", LocalDate.now(INDIA).toString()).put("membershipEnd", LocalDate.now(INDIA).plusDays(14).toString())
            .put("goal", "Build consistency");
        state.withArray("subscriptions").addObject().put("memberId", memberId).put("plan", "Basic").put("amount", 999).put("status", "Trial");
        int invoiceNumber = 1001 + state.withArray("payments").size();
        state.withArray("payments").addObject().put("memberId", memberId).put("amount", 999).put("status", "Pending").put("invoice", "INV-" + invoiceNumber);
        state.withArray("activity").insertArray(0).add(name + " registered").add("Member");
        store.write(db);

        ObjectNode response = db.objectNode().put("email", email).put("role", "member").put("redirect", "member-dashboard.html");
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/attendance/check-in")
    public JsonNode checkIn(@RequestBody JsonNode body) {
        if (body.hasNonNull("trainerId")) return updateTrainerAttendance(body.path("trainerId").asText(""), false);
        return updateAttendance(body.path("memberId").asText(""), false);
    }

    @PostMapping("/attendance/check-out")
    public JsonNode checkOut(@RequestBody JsonNode body) {
        if (body.hasNonNull("trainerId")) return updateTrainerAttendance(body.path("trainerId").asText(""), true);
        return updateAttendance(body.path("memberId").asText(""), true);
    }

    @GetMapping(value = "/qr", produces = "image/svg+xml")
    public ResponseEntity<String> qr(@RequestParam(defaultValue = "") String memberId, @RequestParam(defaultValue = "") String trainerId, HttpServletRequest request) throws Exception {
        boolean trainerQr = !trainerId.isBlank();
        JsonNode member = findById(store.state().path(trainerQr ? "trainers" : "members"), trainerQr ? trainerId : memberId);
        if (member == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, trainerQr ? "Trainer not found." : "Member not found.");
        String base = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort();
        String target = base + "/attendance?" + (trainerQr ? "trainerId=" + trainerId : "memberId=" + memberId);
        BitMatrix matrix = new QRCodeWriter().encode(target, BarcodeFormat.QR_CODE, 220, 220);
        StringBuilder cells = new StringBuilder();
        for (int y = 0; y < matrix.getHeight(); y++) for (int x = 0; x < matrix.getWidth(); x++) {
            if (matrix.get(x, y)) cells.append("<rect x=\"").append(x).append("\" y=\"").append(y).append("\" width=\"1\" height=\"1\"/>");
        }
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 220 220\"><rect width=\"220\" height=\"220\" fill=\"white\"/><g fill=\"#111\">" + cells + "</g></svg>";
        return ResponseEntity.ok().contentType(MediaType.valueOf("image/svg+xml")).body(svg);
    }

    @GetMapping(value = "/payment-qr", produces = "image/svg+xml")
    public ResponseEntity<String> paymentQr(@RequestParam String memberId, @RequestParam String plan,
                                             @RequestParam int amount, @RequestParam(defaultValue = "UPI") String app) throws Exception {
        JsonNode member = findById(store.state().path("members"), memberId);
        if (member == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found.");
        String note = "AI Gym " + plan + " plan for " + memberId + " via " + app;
        String target = "upi://pay?pa=aigym@upi&pn=" + URLEncoder.encode("AI Gym", StandardCharsets.UTF_8)
            + "&am=" + Math.max(0, amount) + "&cu=INR&tn=" + URLEncoder.encode(note, StandardCharsets.UTF_8);
        BitMatrix matrix = new QRCodeWriter().encode(target, BarcodeFormat.QR_CODE, 260, 260);
        StringBuilder cells = new StringBuilder();
        for (int y = 0; y < matrix.getHeight(); y++) for (int x = 0; x < matrix.getWidth(); x++) {
            if (matrix.get(x, y)) cells.append("<rect x=\"").append(x).append("\" y=\"").append(y).append("\" width=\"1\" height=\"1\"/>");
        }
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 260\"><rect width=\"260\" height=\"260\" rx=\"18\" fill=\"white\"/><g fill=\"#111\">" + cells + "</g></svg>";
        return ResponseEntity.ok().contentType(MediaType.valueOf("image/svg+xml")).body(svg);
    }

    private JsonNode updateAttendance(String memberId, boolean checkout) {
        ObjectNode db = store.read();
        ObjectNode state = (ObjectNode) db.path("state");
        JsonNode memberNode = findById(state.path("members"), memberId);
        if (!(memberNode instanceof ObjectNode member)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found.");
        ArrayNode log = state.withArray("attendanceLog");
        String today = LocalDate.now(INDIA).toString();
        ObjectNode record = null;
        for (JsonNode item : log) if (memberId.equals(item.path("memberId").asText()) && today.equals(item.path("date").asText())) record = (ObjectNode) item;
        ObjectNode response = db.objectNode();

        if (checkout) {
            if (record == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, member.path("name").asText() + " has not checked in today.");
            if (record.hasNonNull("checkOutTime")) return response.put("alreadyCheckedOut", true).put("message", member.path("name").asText() + " is already checked out today.").set("checkIn", record);
            record.put("checkOutTime", ZonedDateTime.now(INDIA).format(TIME));
            addActivity(state, member.path("name").asText() + " checked out", "Check-out");
            response.put("alreadyCheckedOut", false).put("message", member.path("name").asText() + " checked out successfully.").set("checkIn", record);
        } else {
            if (record != null) return response.put("alreadyCheckedIn", true).put("message", member.path("name").asText() + " is already checked in today.").set("checkIn", record);
            record = db.objectNode().put("id", "A" + String.format("%04d", log.size() + 1)).put("memberId", memberId).put("date", today).put("time", ZonedDateTime.now(INDIA).format(TIME));
            log.insert(0, record);
            member.put("attendance", member.path("attendance").asInt() + 1).put("progress", Math.min(100, member.path("progress").asInt() + 2));
            addActivity(state, member.path("name").asText() + " marked attendance", "Check-in");
            response.put("alreadyCheckedIn", false).put("message", member.path("name").asText() + " checked in successfully.").set("checkIn", record);
        }
        response.set("member", member);
        store.write(db);
        return response;
    }

    private JsonNode updateTrainerAttendance(String trainerId, boolean checkout) {
        ObjectNode db = store.read();
        ObjectNode state = (ObjectNode) db.path("state");
        JsonNode trainerNode = findById(state.path("trainers"), trainerId);
        if (!(trainerNode instanceof ObjectNode trainer)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trainer not found.");
        ArrayNode log = state.withArray("trainerAttendanceLog");
        String today = LocalDate.now(INDIA).toString();
        ObjectNode record = null;
        for (JsonNode item : log) if (trainerId.equals(item.path("trainerId").asText()) && today.equals(item.path("date").asText())) record = (ObjectNode) item;
        ObjectNode response = db.objectNode();
        if (checkout) {
            if (record == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, trainer.path("name").asText() + " has not checked in today.");
            if (record.hasNonNull("checkOutTime")) return response.put("alreadyCheckedOut", true).put("message", trainer.path("name").asText() + " is already checked out today.").set("checkIn", record);
            record.put("checkOutTime", ZonedDateTime.now(INDIA).format(TIME)).put("checkOutAt", ZonedDateTime.now(INDIA).toString());
            addActivity(state, trainer.path("name").asText() + " checked out", "Trainer attendance");
            response.put("alreadyCheckedOut", false).put("message", trainer.path("name").asText() + " checked out successfully.").set("checkIn", record);
        } else {
            if (record != null) return response.put("alreadyCheckedIn", true).put("message", trainer.path("name").asText() + " is already checked in today.").set("checkIn", record);
            record = db.objectNode().put("id", "TA" + String.format("%04d", log.size() + 1)).put("trainerId", trainerId).put("date", today).put("time", ZonedDateTime.now(INDIA).format(TIME)).put("checkInAt", ZonedDateTime.now(INDIA).toString()).put("source", "QR");
            log.insert(0, record);
            addActivity(state, trainer.path("name").asText() + " checked in", "Trainer attendance");
            response.put("alreadyCheckedIn", false).put("message", trainer.path("name").asText() + " checked in successfully.").set("checkIn", record);
        }
        response.set("trainer", trainer); store.write(db); return response;
    }

    private void addActivity(ObjectNode state, String text, String tag) {
        ArrayNode activity = state.withArray("activity");
        ArrayNode entry = state.arrayNode().add(text).add(tag);
        activity.insert(0, entry);
        while (activity.size() > 8) activity.remove(activity.size() - 1);
    }

    private JsonNode findById(JsonNode items, String id) {
        if (items.isArray()) for (JsonNode item : items) if (id.equals(item.path("id").asText())) return item;
        return null;
    }

    private String nextId(ArrayNode items, String prefix) {
        int highest = 0;
        for (JsonNode item : items) {
            String digits = item.path("id").asText().replaceAll("\\D", "");
            if (!digits.isBlank()) highest = Math.max(highest, Integer.parseInt(digits));
        }
        return prefix + String.format("%03d", highest + 1);
    }
}
