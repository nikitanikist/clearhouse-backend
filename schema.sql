-- Clearhouse CRM Database Schema
-- PostgreSQL Database Setup

-- Create database (run this separately if needed)
-- CREATE DATABASE clearhouse_crm;

-- Use the database
-- \c clearhouse_crm;

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS form_history CASCADE;
DROP TABLE IF EXISTS form_comments CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS form_family_members CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create ENUM types for roles and statuses
CREATE TYPE user_role AS ENUM ('preparer', 'admin', 'superadmin');
CREATE TYPE form_status AS ENUM ('pending', 'active', 'completed', 'rejected', 'amendment_required');
CREATE TYPE form_type AS ENUM ('T1', 'Corporate');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(50),
    department VARCHAR(255),
    bio TEXT,
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Forms table (main table for closeout forms)
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_number VARCHAR(100) UNIQUE NOT NULL, -- Auto-generated form number
    client_id UUID REFERENCES clients(id) NOT NULL,
    created_by UUID REFERENCES users(id) NOT NULL,
    assigned_to UUID REFERENCES users(id),
    amendment_sent_by UUID REFERENCES users(id), -- Track which admin sent amendment
    status form_status NOT NULL DEFAULT 'pending',
    form_type form_type NOT NULL DEFAULT 'T1',
    
    -- General Information (common for all family members)
    file_path VARCHAR(500) NOT NULL, -- e.g., \\Clearhouse\Clients\Smith_2024\T1
    partner VARCHAR(255),
    manager VARCHAR(255),
    years VARCHAR(50) NOT NULL,
    job_number VARCHAR(100),
    invoice_amount VARCHAR(100),
    invoice_description TEXT,
    bill_detail TEXT,
    payment_required BOOLEAN DEFAULT false,
    wip_recovery VARCHAR(50),
    recovery_reason TEXT,
    
    -- Filing Information
    is_t1 BOOLEAN DEFAULT false,
    is_s216 BOOLEAN DEFAULT false,
    is_s116 BOOLEAN DEFAULT false,
    is_paper_filed BOOLEAN DEFAULT false,
    installments_required BOOLEAN DEFAULT false,
    
    -- T1/T2 Information
    t106 BOOLEAN DEFAULT false,
    t1134 BOOLEAN DEFAULT false,
    ontario_annual_return BOOLEAN DEFAULT false,
    t_slips BOOLEAN DEFAULT false,
    quebec_return BOOLEAN DEFAULT false,
    alberta_return BOOLEAN DEFAULT false,
    t2091_principal_residence BOOLEAN DEFAULT false,
    t1135_foreign_property BOOLEAN DEFAULT false,
    t1032_pension_split BOOLEAN DEFAULT false,
    
    -- Other Information
    hst_draft_or_final VARCHAR(50),
    other_notes TEXT,
    other_documents TEXT,
    corporate_installments_required BOOLEAN DEFAULT false,
    fed_schedule_attached BOOLEAN DEFAULT false,
    hst_installment_required BOOLEAN DEFAULT false,
    hst_tab_completed BOOLEAN DEFAULT false,
    
    -- T1 Summary
    prior_periods_balance DECIMAL(12,2),
    taxes_payable DECIMAL(12,2),
    installments_during_year DECIMAL(12,2),
    installments_after_year DECIMAL(12,2),
    amount_owing DECIMAL(12,2),
    due_date DATE,
    
    -- HST Summary
    hst_prior_balance DECIMAL(12,2),
    hst_payable DECIMAL(12,2),
    hst_installments_during DECIMAL(12,2),
    hst_installments_after DECIMAL(12,2),
    hst_payment_due DECIMAL(12,2),
    hst_due_date DATE,
    
    -- Complete form data as JSON (for flexibility)
    form_data JSONB,
    
    -- Timestamps and metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

-- Family members table (for multiple family members per form)
CREATE TABLE form_family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    signing_person VARCHAR(255),
    signing_email VARCHAR(255),
    additional_emails TEXT[], -- Array of additional emails
    is_primary BOOLEAN DEFAULT false,
    
    -- Tax return information
    is_t1 BOOLEAN DEFAULT false,
    is_s216 BOOLEAN DEFAULT false,
    is_s116 BOOLEAN DEFAULT false,
    is_paper_filed BOOLEAN DEFAULT false,
    installments_required BOOLEAN DEFAULT false,
    personal_tax_payment DECIMAL(12,2),
    
    -- NEW: Individual fields per family member
    hst_draft_or_final VARCHAR(50) DEFAULT 'N/A',
    hst_installments_required BOOLEAN DEFAULT false,
    payment_required BOOLEAN DEFAULT false,
    other_notes TEXT,
    -- NEW: Individual Personal Tax Summary fields per family member
    prior_periods_balance VARCHAR(50) DEFAULT '0',
    installments_during_year VARCHAR(50) DEFAULT '0',
    installments_after_year VARCHAR(50) DEFAULT '0',
    tax_payment_due_date VARCHAR(100),
    return_filing_due_date VARCHAR(20) DEFAULT 'April 30',
    -- NEW: Individual HST fields per family member
    hst_prior_balance VARCHAR(50) DEFAULT '0',
    hst_payable VARCHAR(50) DEFAULT '0',
    hst_installments_during VARCHAR(50) DEFAULT '0',
    hst_installments_after VARCHAR(50) DEFAULT '0',
    hst_payment_due VARCHAR(50) DEFAULT '0',
    hst_due_date VARCHAR(20) DEFAULT 'April 30',
    
    -- Order in the form
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files table (for PDF uploads and attachments)
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    family_member_id UUID REFERENCES form_family_members(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL, -- Local storage path
    file_size BIGINT,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    file_category VARCHAR(100), -- 'tax_document', 'installment_attachment', 'other'
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_extracted BOOLEAN DEFAULT false,
    extraction_data JSONB -- Store extracted data from PDFs
);

-- Form comments/notes table
CREATE TABLE form_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    comment TEXT NOT NULL,
    is_amendment_request BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Form history/audit trail table
CREATE TABLE form_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', etc.
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_client_id ON forms(client_id);
CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_assigned_to ON forms(assigned_to);
CREATE INDEX idx_forms_years ON forms(years);
CREATE INDEX idx_forms_job_number ON forms(job_number);
CREATE INDEX idx_forms_created_at ON forms(created_at);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_files_form_id ON files(form_id);
CREATE INDEX idx_form_comments_form_id ON form_comments(form_id);
CREATE INDEX idx_form_history_form_id ON form_history(form_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_family_members_updated_at BEFORE UPDATE ON form_family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate form numbers
CREATE OR REPLACE FUNCTION generate_form_number()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix VARCHAR(2);
    max_number INTEGER;
    new_number VARCHAR(100);
BEGIN
    -- Get last 2 digits of current year
    year_suffix := RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2);
    
    -- Get the maximum number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(form_number FROM 4 FOR 5) AS INTEGER)), 0)
    INTO max_number
    FROM forms
    WHERE form_number LIKE 'CF' || year_suffix || '%';
    
    -- Generate new form number (e.g., CF2400001)
    new_number := 'CF' || year_suffix || LPAD((max_number + 1)::TEXT, 5, '0');
    
    NEW.form_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate form numbers
CREATE TRIGGER generate_form_number_trigger
    BEFORE INSERT ON forms
    FOR EACH ROW
    WHEN (NEW.form_number IS NULL)
    EXECUTE FUNCTION generate_form_number();

-- Insert initial super admin user (password: admin123)
-- Note: In production, use a proper password hashing library
INSERT INTO users (email, password_hash, name, role) 
VALUES ('admin@clearhouse.ca', '$2b$10$YourHashedPasswordHere', 'System Admin', 'superadmin');

-- Insert some test data (optional - comment out in production)
-- Test clients
INSERT INTO clients (name, email) VALUES
('John Smith', 'john.smith@example.com'),
('Sarah Johnson', 'sarah.johnson@example.com'),
('Michael Brown', 'michael.brown@example.com');

-- Grant permissions (adjust based on your PostgreSQL user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;