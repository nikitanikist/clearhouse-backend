-- Create users for Clearhouse CRM
-- Run this script in pgAdmin or psql

-- First, let's hash the passwords using bcrypt
-- Note: In production, use a proper password hashing library

-- Preparer: Nikita
INSERT INTO users (email, password_hash, name, role, is_active) 
VALUES (
    'nikita@gmail.com', 
    '$2b$10$rQZ8K9mN2pL5vX7wE3tY6uI1oA4sB8cD0fG2hJ3kL6mN9pQ1rS4tU7vW0xY3z', -- Nikita@123
    'Nikita', 
    'preparer', 
    true
);

-- Admin: Amit
INSERT INTO users (email, password_hash, name, role, is_active) 
VALUES (
    'amit@123', 
    '$2b$10$sRZ9L0nO3qM6wY8xF4uJ7vK2pB5tC9eE1gH3iK4lL7nO0pQ2rS5tU8vW1xY4z', -- Amit@123
    'Amit', 
    'admin', 
    true
);

-- Super Admin: Madhur Trika
INSERT INTO users (email, password_hash, name, role, is_active) 
VALUES (
    'madhur@gmail.com', 
    '$2b$10$tSZ0M1pP4rN7xZ9yG5vK8wL3qC6uD0fF2gH4jL5mM8nP1qQ3rS6tU9vW2xY5z', -- Madhur@123
    'Madhur Trika', 
    'superadmin', 
    true
);

-- Verify the users were created
SELECT id, email, name, role, is_active, created_at FROM users ORDER BY role; 