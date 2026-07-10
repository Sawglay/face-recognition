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
    
    // Connect to database
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUrl, dbUser, dbPassword);
    }
    
   /**
     * Enrolls a new identity and saves profile image to local metadata database.
     */
    public boolean enrollIdentity(String name, String role, File imageFile) {
        if (!imageFile.exists()) {
            System.err.println("[ERROR] Staging image file does not exist.");
            return false;
        }

        try {
            // Read image bytes and parse to base64 string
            byte[] fileContent = Files.readAllBytes(imageFile.toPath());
            String base64Image = java.util.Base64.getEncoder().encodeToString(fileContent);
            String customId = "usr_" + Long.toHexString(Double.doubleToLongBits(Math.random()));

            String query = "INSERT INTO enrolled_identitites (id, name, role_classification, photo_base64) VALUES (?, ?, ?, ?)";
            
            try (Connection conn = getConnection(); 
                 PreparedStatement pstmt = conn.prepareStatement(query)) {
                
                pstmt.setString(1, customId);
                pstmt.setString(2, name);
                pstmt.setString(3, role);
                pstmt.setString(4, "data:image/jpeg;base64," + base64Image);
                
                int rowsAffected = pstmt.executeUpdate();
                if (rowsAffected > 0) {
                    System.out.println("[JAVA SQL] Successfully enrolled identity: " + name + " [ID: " + customId + "]");
                    return true;
                }
            }        
        } catch (IOException | SQLException e) {
            System.err.println("[ERROR] Failed to execute enrollment transaction: " + e.getMessage());
        }
        return false;
    }
    
    /**
     * Returns a list of all active enrolled identities from the relational SQL backend.
     */
    public List<Identity> retrieveAllIdentities() {
        List<Identity> roster = new ArrayList<>();
        String query = "SELECT id, name, role_classification, photo_base64, created_at FROM enrolled_identitites ORDER BY created_at DESC";

        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                Identity identity = new Identity(
                    rs.getString("id"),
                    rs.getString("name"),
                    rs.getString("role_classification"),
                    rs.getString("photo_base64"),
                    rs.getTimestamp("created_at")
                );
                roster.add(identity);
            }
        } catch (SQLException e) {
            System.err.println("[ERROR] Failed to query database: " + e.getMessage());
        }
        return roster;
    }
    
    /**
     * Logs successful or failed authentication attempts in the audit trail database.
     */
    public void logVerificationAttempt(String matchedId, double confidence, String emotion, int symmetry) {
        String query = "INSERT INTO biometric_scans (matched_id, confidence_score, detected_emotion, symmetry_score) VALUES (?, ?, ?, ?)";
        
        try (Connection conn = getConnection();
             PreparedStatement pstmt = conn.prepareStatement(query)) {
            
            if (matchedId != null) {
                pstmt.setString(1, matchedId);
            } else {
                pstmt.setNull(1, java.sql.Types.VARCHAR);
            }
            pstmt.setDouble(2, confidence);
            pstmt.setString(3, emotion);
            pstmt.setDouble(4, symmetry);
            
            pstmt.executeUpdate();
            System.out.println("[JAVA SQL] Audit scan log created successfully. Match confidence: " + confidence + "%");
        } catch (SQLException e) {
            System.err.println("[ERROR] Failed to write scan audit log: " + e.getMessage());
        }
    }
}
