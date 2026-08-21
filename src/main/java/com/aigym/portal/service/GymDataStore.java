package com.aigym.portal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GymDataStore {
    private final ObjectMapper mapper;
    private final Path dataFile;

    public GymDataStore(ObjectMapper mapper, @Value("${app.data-file:data/db.json}") String dataFile) {
        this.mapper = mapper;
        this.dataFile = Path.of(dataFile).toAbsolutePath().normalize();
    }

    public synchronized ObjectNode read() {
        try {
            if (!Files.exists(dataFile)) {
                throw new IllegalStateException("Gym database is missing: " + dataFile);
            }
            return (ObjectNode) mapper.readTree(dataFile.toFile());
        } catch (IOException error) {
            throw new IllegalStateException("Unable to read gym database", error);
        }
    }

    public synchronized void write(ObjectNode database) {
        try {
            Files.createDirectories(dataFile.getParent());
            Path temp = dataFile.resolveSibling(dataFile.getFileName() + ".tmp");
            mapper.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(), database);
            Files.move(temp, dataFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException error) {
            throw new IllegalStateException("Unable to save gym database", error);
        }
    }

    public synchronized JsonNode state() {
        return read().path("state");
    }

    public synchronized void replaceState(JsonNode state) {
        ObjectNode database = read();
        database.set("state", state.deepCopy());
        write(database);
    }
}
