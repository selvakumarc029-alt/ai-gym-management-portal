package com.aigym.portal.controller;

import java.time.Year;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    private static final Map<String, String> TITLES = Map.of(
        "index", "AI Gym Portal",
        "login", "Login | AI Gym",
        "register", "Register | AI Gym",
        "admin-dashboard", "Admin Dashboard | AI Gym",
        "trainer-dashboard", "Trainer Dashboard | AI Gym",
        "member-dashboard", "Member Dashboard | AI Gym",
        "attendance", "Attendance | AI Gym"
    );

    @GetMapping({"/", "/index.html"})
    public String home(Model model) { return view("index", model); }

    @GetMapping({"/login", "/login.html"})
    public String login(Model model) { return view("login", model); }

    @GetMapping({"/register", "/register.html"})
    public String register(Model model) { return view("register", model); }

    @GetMapping({"/admin", "/admin-dashboard.html"})
    public String admin(Model model) { return view("admin-dashboard", model); }

    @GetMapping({"/trainer", "/trainer-dashboard.html"})
    public String trainer(Model model) { return view("trainer-dashboard", model); }

    @GetMapping({"/member", "/member-dashboard.html"})
    public String member(Model model) { return view("member-dashboard", model); }

    @GetMapping({"/attendance", "/attendance.html"})
    public String attendance(Model model) { return view("attendance", model); }

    private String view(String name, Model model) {
        model.addAttribute("pageTitle", TITLES.get(name));
        model.addAttribute("currentYear", Year.now().getValue());
        model.addAttribute("appName", "AI GYM");
        return name;
    }
}
