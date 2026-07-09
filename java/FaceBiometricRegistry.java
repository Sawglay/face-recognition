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
