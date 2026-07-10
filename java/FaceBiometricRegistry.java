package java;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/**
 * Enterprise Face Biometrics Registry Controller
 * Handles relational storage, logs auditing, and profile photo base64 extraction.
 */
public class FaceBiometricRegistry {

    private final String dbUrl;
    private final String dbUser;
    private final String dbPassword;

    public FaceBiometricRegistry(String dbUrl, String dbUser, String dbPassword) {
        this.dbUrl = dbUrl;
        this.dbUser = dbUser;
        this.dbPassword = dbPassword;
    }
    
    // Model class for Enrolled Identity
    public static class Identity {
        public String id;
        public String name;
        public String role;
        public String photoBase64;
        public Timestamp enrolledAt;

        public Identity(String id, String name, String role, String photoBase64, Timestamp enrolledAt) {
            this.id = id;
            this.name = name;
            this.role = role;
            this.photoBase64 = photoBase64;
            this.enrolledAt = enrolledAt;
        }
    }
