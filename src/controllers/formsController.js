const { v4: uuidv4 } = require('uuid');
const { pool, query, transaction } = require('../config/database');

// Helper function to clean numeric values
const cleanNumericValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and spaces, then parse as float
    const cleaned = value.replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

// Helper function to convert date strings to proper date format
const convertDateString = (dateString) => {
  if (!dateString || dateString === 'N/A' || dateString === '' || dateString === 'null') {
    return null;
  }
  
  // If it's already a proper date format (YYYY-MM-DD), return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Handle Canadian tax filing dates
  const currentYear = new Date().getFullYear();
  
  if (dateString === 'April 30') {
    const convertedDate = `${currentYear}-04-30`;
    return convertedDate;
  }
  
  if (dateString === 'June 15') {
    const convertedDate = `${currentYear}-06-15`;
    return convertedDate;
  }
  
  // Try to parse other date formats
  try {
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      const convertedDate = parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      return convertedDate;
    }
  } catch (error) {
    // console.log('DEBUG: Could not parse date:', dateString, 'Error:', error.message);
  }
  
  // If we can't parse it, return null
  return null;
};

// Helper function to get default admin ID for form assignment
const getDefaultAdminId = async (dbClient) => {
  try {
    const result = await dbClient.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = $2 ORDER BY created_at ASC LIMIT 1',
      ['admin', true]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    // console.error('Error getting default admin ID:', error);
    return null;
  }
};

// Create a new closeout form
exports.createForm = async (req, res) => {
  try {
    const formData = req.body;
    
    if (!formData || !formData.clientEmail) {
      return res.status(400).json({ error: 'Missing required clientEmail' });
    }
    
    // Extract the actual form data from the nested structure
    const actualFormData = formData.formData || formData;
    
    // Start transaction
    await transaction(async (client) => {
      // 1. Check if client exists
      let clientId;
      const clientResult = await client.query('SELECT id FROM clients WHERE email = $1', [formData.clientEmail]);
      if (clientResult.rows.length > 0) {
        clientId = clientResult.rows[0].id;
      } else {
        // Create new client
        const newClientId = uuidv4();
        const clientName = formData.clientName || actualFormData.signingPerson || actualFormData.clientName || '';
        await client.query(
          'INSERT INTO clients (id, name, email, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
          [newClientId, clientName, formData.clientEmail, true]
        );
        clientId = newClientId;
      }

      // 2. Insert form - Provide all required and important optional columns
      const formId = uuidv4();
      const formInsertQuery = `
        INSERT INTO forms (
          id, form_number, client_id, created_by, assigned_to, status, form_type, file_path, partner, manager, years, job_number, invoice_amount, invoice_description, bill_detail, payment_required, wip_recovery, recovery_reason, is_t1, is_s216, is_s116, is_paper_filed, installments_required, t106, t1134, ontario_annual_return, t_slips, quebec_return, alberta_return, t2091_principal_residence, t1135_foreign_property, t1032_pension_split, hst_draft_or_final, other_notes, other_documents, corporate_installments_required, fed_schedule_attached, hst_installment_required, hst_tab_completed, prior_periods_balance, taxes_payable, installments_during_year, installments_after_year, amount_owing, due_date, hst_prior_balance, hst_payable, hst_installments_during, hst_installments_after, hst_payment_due, hst_due_date, form_data, created_at, updated_at, completed_at, rejected_at, rejection_reason
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57
        ) RETURNING id`;
      const formInsertValues = [
        formId, // id
        `FORM-${Date.now()}`, // form_number
        clientId, // client_id
        (actualFormData.createdBy && actualFormData.createdBy.id) ? actualFormData.createdBy.id : (req.user ? req.user.id : uuidv4()), // created_by
        (actualFormData.assignedTo && actualFormData.assignedTo.id) ? actualFormData.assignedTo.id : (req.user.role === 'preparer' ? await getDefaultAdminId(client) : null), // assigned_to
        'pending', // status (always set to pending on create)
        actualFormData.formType || 'T1', // form_type
        actualFormData.filePath || null, // file_path
        actualFormData.partner || null, // partner
        actualFormData.manager || null, // manager
        actualFormData.years || null, // years
        actualFormData.jobNumber || null, // job_number
        actualFormData.invoiceAmount || null, // invoice_amount
        actualFormData.invoiceDescription || null, // invoice_description
        actualFormData.billDetail || null, // bill_detail
        actualFormData.paymentRequired || null, // payment_required
        actualFormData.wipRecovery || null, // wip_recovery
        actualFormData.recoveryReason || null, // recovery_reason
        actualFormData.isT1 || null, // is_t1
        actualFormData.isS216 || null, // is_s216
        actualFormData.isS116 || null, // is_s116
        actualFormData.isPaperFiled || null, // is_paper_filed
        actualFormData.installmentsRequired || null, // installments_required
        actualFormData.t106 || null, // t106
        actualFormData.t1134 || null, // t1134
        actualFormData.ontarioAnnualReturn || null, // ontario_annual_return
        actualFormData.tSlips || null, // t_slips
        actualFormData.quebecReturn || null, // quebec_return
        actualFormData.albertaReturn || null, // alberta_return
        actualFormData.t2091PrincipalResidence || null, // t2091_principal_residence
        actualFormData.t1135ForeignProperty || null, // t1135_foreign_property
        actualFormData.t1032PensionSplit || null, // t1032_pension_split
        actualFormData.hstDraftOrFinal || null, // hst_draft_or_final
        actualFormData.otherNotes || null, // other_notes
        actualFormData.otherDocuments || null, // other_documents
        actualFormData.corporateInstallmentsRequired || null, // corporate_installments_required
        actualFormData.fedScheduleAttached || null, // fed_schedule_attached
        actualFormData.hstInstallmentRequired || null, // hst_installment_required
        actualFormData.hstTabCompleted || null, // hst_tab_completed
        cleanNumericValue(actualFormData.priorPeriodsBalance), // prior_periods_balance
        cleanNumericValue(actualFormData.taxesPayable), // taxes_payable
        cleanNumericValue(actualFormData.installmentsDuringYear), // installments_during_year
        cleanNumericValue(actualFormData.installmentsAfterYear), // installments_after_year
        cleanNumericValue(actualFormData.amountOwing), // amount_owing
        convertDateString(actualFormData.dueDate || actualFormData.returnFilingDueDate), // due_date
        cleanNumericValue(actualFormData.hstPriorBalance), // hst_prior_balance
        cleanNumericValue(actualFormData.hstPayable), // hst_payable
        cleanNumericValue(actualFormData.hstInstallmentsDuring), // hst_installments_during
        cleanNumericValue(actualFormData.hstInstallmentsAfter), // hst_installments_after
        cleanNumericValue(actualFormData.hstPaymentDue), // hst_payment_due
        convertDateString(actualFormData.hstDueDate), // hst_due_date
        JSON.stringify(actualFormData), // form_data
        new Date(), // created_at
        new Date(), // updated_at
        null, // completed_at
        null, // rejected_at
        null  // rejection_reason
      ];
      // All optional fields use '|| null' to ensure null is saved if not provided, allowing later updates.
      await client.query(formInsertQuery, formInsertValues);

      // 3. Insert family members - Include all required columns
      if (Array.isArray(actualFormData.familyMembers)) {
        for (let i = 0; i < actualFormData.familyMembers.length; i++) {
          const member = actualFormData.familyMembers[i];
          await client.query(
            'INSERT INTO form_family_members (id, form_id, client_name, signing_person, signing_email, hst_draft_or_final, hst_installments_required, payment_required, other_notes, prior_periods_balance, installments_during_year, installments_after_year, tax_payment_due_date, return_filing_due_date, hst_prior_balance, hst_payable, hst_installments_during, hst_installments_after, hst_payment_due, hst_due_date, is_primary, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())',
            [
              uuidv4(),
              formId,
              member.clientName || '',
              member.signingPerson || '',
              member.signingEmail || '',
              member.hstDraftOrFinal || 'N/A',
              member.hstInstallmentsRequired || false,
              member.paymentRequired || false,
              member.otherNotes || '',
              member.priorPeriodsBalance || '0',
              member.installmentsDuringYear || '0',
              member.installmentsAfterYear || '0',
              member.taxPaymentDueDate || '',
              member.returnFilingDueDate || 'April 30',
              member.hstPriorBalance || '0',
              member.hstPayable || '0',
              member.hstInstallmentsDuring || '0',
              member.hstInstallmentsAfter || '0',
              member.hstPaymentDue || '0',
              member.hstDueDate || 'April 30',
              i === 0 // is_primary
            ]
          );
        }
      }

      res.status(201).json({ message: 'Form saved', formId, clientId });
    });
  } catch (error) {
    // console.error('Error creating form:', error);
    // console.error('Error stack:', error.stack);
    // console.error('Error message:', error.message);
    res.status(500).json({ error: 'Failed to create form', details: error.message });
  }
};

// Fetch forms based on user role and assignment
exports.getAllForms = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let sqlQuery;
    let params = [];
    
    // Superadmin can see all forms
    if (userRole === 'superadmin') {
      sqlQuery = `
        SELECT 
          f.id, f.form_number, f.client_id, f.created_by, f.assigned_to, f.status, f.form_type,
          f.file_path, f.partner, f.manager, f.years, f.job_number, f.invoice_amount, 
          f.invoice_description, f.bill_detail, f.payment_required, f.wip_recovery, f.recovery_reason,
          f.is_t1, f.is_s216, f.is_s116, f.is_paper_filed, f.installments_required,
          f.t106, f.t1134, f.ontario_annual_return, f.t_slips, f.quebec_return, f.alberta_return,
          f.t2091_principal_residence, f.t1135_foreign_property, f.t1032_pension_split,
          f.hst_draft_or_final, f.other_notes, f.other_documents,
          f.corporate_installments_required, f.fed_schedule_attached, f.hst_installment_required, f.hst_tab_completed,
          f.prior_periods_balance, f.taxes_payable, f.installments_during_year, f.installments_after_year, f.amount_owing,
          f.due_date, f.hst_prior_balance, f.hst_payable, f.hst_installments_during, f.hst_installments_after,
          f.hst_payment_due, f.hst_due_date, f.form_data, f.created_at, f.updated_at, f.completed_at, f.rejected_at, f.rejection_reason,
          c.name as client_name, c.email as client_email,
          u1.name as created_by_name, u2.name as assigned_to_name
        FROM forms f
        LEFT JOIN clients c ON f.client_id = c.id
        LEFT JOIN users u1 ON f.created_by = u1.id
        LEFT JOIN users u2 ON f.assigned_to = u2.id
        ORDER BY f.created_at DESC
      `;
    } 
    // Admin can see forms assigned to them and amendment forms they sent
    else if (userRole === 'admin') {
      sqlQuery = `
        SELECT 
          f.id, f.form_number, f.client_id, f.created_by, f.assigned_to, f.amendment_sent_by, f.status, f.form_type,
          f.file_path, f.partner, f.manager, f.years, f.job_number, f.invoice_amount, 
          f.invoice_description, f.bill_detail, f.payment_required, f.wip_recovery, f.recovery_reason,
          f.is_t1, f.is_s216, f.is_s116, f.is_paper_filed, f.installments_required,
          f.t106, f.t1134, f.ontario_annual_return, f.t_slips, f.quebec_return, f.alberta_return,
          f.t2091_principal_residence, f.t1135_foreign_property, f.t1032_pension_split,
          f.hst_draft_or_final, f.other_notes, f.other_documents,
          f.corporate_installments_required, f.fed_schedule_attached, f.hst_installment_required, f.hst_tab_completed,
          f.prior_periods_balance, f.taxes_payable, f.installments_during_year, f.installments_after_year, f.amount_owing,
          f.due_date, f.hst_prior_balance, f.hst_payable, f.hst_installments_during, f.hst_installments_after,
          f.hst_payment_due, f.hst_due_date, f.form_data, f.created_at, f.updated_at, f.completed_at, f.rejected_at, f.rejection_reason,
          c.name as client_name, c.email as client_email,
          u1.name as created_by_name, u2.name as assigned_to_name, u3.name as amendment_sent_by_name
        FROM forms f
        LEFT JOIN clients c ON f.client_id = c.id
        LEFT JOIN users u1 ON f.created_by = u1.id
        LEFT JOIN users u2 ON f.assigned_to = u2.id
        LEFT JOIN users u3 ON f.amendment_sent_by = u3.id
        WHERE f.assigned_to = $1 OR f.amendment_sent_by = $1
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    }
    // Preparer can see forms they created
    else if (userRole === 'preparer') {
      sqlQuery = `
        SELECT 
          f.id, f.form_number, f.client_id, f.created_by, f.assigned_to, f.amendment_sent_by, f.status, f.form_type,
          f.file_path, f.partner, f.manager, f.years, f.job_number, f.invoice_amount, 
          f.invoice_description, f.bill_detail, f.payment_required, f.wip_recovery, f.recovery_reason,
          f.is_t1, f.is_s216, f.is_s116, f.is_paper_filed, f.installments_required,
          f.t106, f.t1134, f.ontario_annual_return, f.t_slips, f.quebec_return, f.alberta_return,
          f.t2091_principal_residence, f.t1135_foreign_property, f.t1032_pension_split,
          f.hst_draft_or_final, f.other_notes, f.other_documents,
          f.corporate_installments_required, f.fed_schedule_attached, f.hst_installment_required, f.hst_tab_completed,
          f.prior_periods_balance, f.taxes_payable, f.installments_during_year, f.installments_after_year, f.amount_owing,
          f.due_date, f.hst_prior_balance, f.hst_payable, f.hst_installments_during, f.hst_installments_after,
          f.hst_payment_due, f.hst_due_date, f.form_data, f.created_at, f.updated_at, f.completed_at, f.rejected_at, f.rejection_reason,
          c.name as client_name, c.email as client_email,
          u1.name as created_by_name, u2.name as assigned_to_name, u3.name as amendment_sent_by_name
        FROM forms f
        LEFT JOIN clients c ON f.client_id = c.id
        LEFT JOIN users u1 ON f.created_by = u1.id
        LEFT JOIN users u2 ON f.assigned_to = u2.id
        LEFT JOIN users u3 ON f.amendment_sent_by = u3.id
        WHERE f.created_by = $1
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    }
    else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    
    // First, fetch the forms
    const formsResult = await query(sqlQuery, params);
    const forms = formsResult.rows;
    
    // Now fetch family members for each form
    const formsWithFamilyMembers = [];
    
    for (const form of forms) {
      // Fetch family members for this form - only query columns that exist
      const familyMembersResult = await query(
        `SELECT 
          id, form_id, client_name, signing_person, signing_email,
          is_primary, created_at, updated_at
        FROM form_family_members 
        WHERE form_id = $1 
        ORDER BY is_primary DESC, created_at ASC`,
        [form.id]
      );
      
      // Transform family members data to match frontend expectations
      const familyMembers = familyMembersResult.rows.map((member, index) => {
        // Use index-based matching instead of ID-based matching to solve the mismatch issue
        // The order is guaranteed: primary member (index 0), then secondary members (index 1, 2, etc.)
        const memberData = form.form_data?.familyMembers?.[index] || {};
        
        return {
          id: member.id,
          formId: member.form_id,
          clientName: member.client_name,
          signingPerson: member.signing_person,
          signingEmail: member.signing_email,
          isPrimary: member.is_primary,
          createdAt: member.created_at,
          updatedAt: member.updated_at,
          // Extract data from form_data JSON using index-based matching
          hstDraftOrFinal: memberData.hstDraftOrFinal || 'N/A',
          hstInstallmentsRequired: memberData.hstInstallmentsRequired || false,
          paymentRequired: memberData.paymentRequired || false,
          otherNotes: memberData.otherNotes || '',
          priorPeriodsBalance: memberData.priorPeriodsBalance || '0',
          installmentsDuringYear: memberData.installmentsDuringYear || '0',
          installmentsAfterYear: memberData.installmentsAfterYear || '0',
          taxPaymentDueDate: memberData.taxPaymentDueDate || '',
          returnFilingDueDate: memberData.returnFilingDueDate || 'April 30',
          hstPriorBalance: memberData.hstPriorBalance || '0',
          hstPayable: memberData.hstPayable || '0',
          hstInstallmentsDuring: memberData.hstInstallmentsDuring || '0',
          hstInstallmentsAfter: memberData.hstInstallmentsAfter || '0',
          hstPaymentDue: memberData.hstPaymentDue || '0',
          hstDueDate: memberData.hstDueDate || 'April 30',
          // Filing detail fields
          isT1135: memberData.isT1135 || false,
          isT2091: memberData.isT2091 || false,
          isT1032: memberData.isT1032 || false,
          // Financial fields
          taxesPayable: memberData.taxesPayable || '0',
          amountOwing: memberData.amountOwing || '0'
        };
      });
      
      // Add family members to the form
      const formWithFamilyMembers = {
        ...form,
        familyMembers: familyMembers
      };
      
      formsWithFamilyMembers.push(formWithFamilyMembers);
    }
    
    res.json(formsWithFamilyMembers);
  } catch (error) {
    console.error('Error fetching forms:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch forms', details: error.message });
  }
};

// Get all admin users for reassignment
exports.getAdminUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email FROM users WHERE role = $1 AND is_active = $2 ORDER BY name',
      ['admin', true]
    );
    
    res.json(result.rows);
  } catch (error) {
    // console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
};

// Reassign form to different admin
exports.reassignForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { assignedToId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check if user has permission to reassign
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only admins and superadmins can reassign forms' });
    }
    
    // Verify the target user is an admin
    const targetUserResult = await query(
      'SELECT id, name, role FROM users WHERE id = $1 AND role = $2 AND is_active = $3',
      [assignedToId, 'admin', true]
    );
    
    if (targetUserResult.rows.length === 0) {
      return res.status(400).json({ error: 'Target user is not a valid active admin' });
    }
    
    // Update the form assignment
    const updateResult = await query(
      'UPDATE forms SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [assignedToId, formId]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    res.json({ 
      message: 'Form reassigned successfully',
      formId,
      assignedToId,
      assignedToName: targetUserResult.rows[0].name
    });
    
  } catch (error) {
    // console.error('Error reassigning form:', error);
    res.status(500).json({ error: 'Failed to reassign form' });
  }
};

// Update existing form data
exports.updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const formData = req.body;
    
    if (!formId || !formData) {
      return res.status(400).json({ error: 'Missing required fields: formId and formData' });
    }
    
    const client = await pool.connect();
    
    try {
      // Check if form exists and get current data
      const formResult = await client.query(
        'SELECT id, amendment_sent_by, assigned_to FROM forms WHERE id = $1',
        [formId]
      );
      
      if (formResult.rows.length === 0) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      const currentForm = formResult.rows[0];
      const isAmendmentResubmission = currentForm.amendment_sent_by && currentForm.status === 'rejected';
      
      // Update form data - map frontend fields to database fields
      let updateQuery = `
        UPDATE forms 
        SET 
          file_path = $1,
          partner = $2,
          manager = $3,
          years = $4,
          job_number = $5,
          invoice_amount = $6,
          invoice_description = $7,
          bill_detail = $8,
          payment_required = $9,
          wip_recovery = $10,
          recovery_reason = $11,
          is_t1 = $12,
          is_s216 = $13,
          is_s116 = $14,
          is_paper_filed = $15,
          installments_required = $16,
          t106 = $17,
          t1134 = $18,
          ontario_annual_return = $19,
          t_slips = $20,
          quebec_return = $21,
          alberta_return = $22,
          t2091_principal_residence = $23,
          t1135_foreign_property = $24,
          t1032_pension_split = $25,
          hst_draft_or_final = $26,
          other_notes = $27,
          other_documents = $28,
          corporate_installments_required = $29,
          fed_schedule_attached = $30,
          hst_installment_required = $31,
          hst_tab_completed = $32,
          prior_periods_balance = $33,
          taxes_payable = $34,
          installments_during_year = $35,
          installments_after_year = $36,
          amount_owing = $37,
          due_date = $38,
          hst_prior_balance = $39,
          hst_payable = $40,
          hst_installments_during = $41,
          hst_installments_after = $42,
          hst_payment_due = $43,
          hst_due_date = $44,
          form_data = $45,
          updated_at = NOW()
      `;
      
      // Add amendment resubmission logic
      if (isAmendmentResubmission) {
        updateQuery += `,
          status = 'pending',
          assigned_to = $47,
          amendment_sent_by = NULL
        WHERE id = $48
        RETURNING id
      `;
      } else {
        updateQuery += `
        WHERE id = $46
        RETURNING id
      `;
      }
      
      let updateValues = [
        formData.filePath || null,
        formData.partner || null,
        formData.manager || null,
        formData.years || null,
        formData.jobNumber || null,
        formData.invoiceAmount || null,
        formData.invoiceDescription || null,
        formData.billDetail || null,
        formData.paymentRequired || false,
        formData.wipRecovery || null,
        formData.recoveryReason || null,
        formData.isT1 || false,
        formData.isS216 || false,
        formData.isS116 || false,
        formData.isPaperFiled || false,
        formData.installmentsRequired || false,
        formData.t106 || false,
        formData.t1134 || false,
        formData.ontarioAnnualReturn || false,
        formData.tSlips || false,
        formData.quebecReturn || false,
        formData.albertaReturn || false,
        formData.t2091PrincipalResidence || false,
        formData.t1135ForeignProperty || false,
        formData.t1032PensionSplit || false,
        formData.hstDraftOrFinal || null,
        formData.otherNotes || null,
        formData.otherDocuments || null,
        formData.corporateInstallmentsRequired || false,
        formData.fedScheduleAttached || false,
        formData.hstInstallmentRequired || false,
        formData.hstTabCompleted || false,
        cleanNumericValue(formData.priorPeriodsBalance),
        cleanNumericValue(formData.taxesPayable),
        cleanNumericValue(formData.installmentsDuringYear),
        cleanNumericValue(formData.installmentsAfterYear),
        cleanNumericValue(formData.amountOwing),
        formData.dueDate ? convertDateString(formData.dueDate) : null,
        cleanNumericValue(formData.hstPriorBalance),
        cleanNumericValue(formData.hstPayable),
        cleanNumericValue(formData.hstInstallmentsDuring),
        cleanNumericValue(formData.hstInstallmentsAfter),
        cleanNumericValue(formData.hstPaymentDue),
        formData.hstDueDate ? convertDateString(formData.hstDueDate) : null,
        JSON.stringify(formData)
      ];
      
      // Add amendment resubmission values
      if (isAmendmentResubmission) {
        updateValues.push(currentForm.amendment_sent_by, formId);
      } else {
        updateValues.push(formId);
      }
      
      await client.query(updateQuery, updateValues);
      
      // Fetch the updated form data to return to frontend
      try {
        const updatedFormResult = await client.query(`
          SELECT 
            f.id, f.form_number, f.client_id, f.created_by, f.assigned_to, f.amendment_sent_by, f.status, f.form_type,
            f.file_path, f.partner, f.manager, f.years, f.job_number, f.invoice_amount, 
            f.invoice_description, f.bill_detail, f.payment_required, f.wip_recovery, f.recovery_reason,
            f.is_t1, f.is_s216, f.is_s116, f.is_paper_filed, f.installments_required,
            f.t106, f.t1134, f.ontario_annual_return, f.t_slips, f.quebec_return, f.alberta_return,
            f.t2091_principal_residence, f.t1135_foreign_property, f.t1032_pension_split,
            f.hst_draft_or_final, f.other_notes, f.other_documents,
            f.corporate_installments_required, f.fed_schedule_attached, f.hst_installment_required, f.hst_tab_completed,
            f.prior_periods_balance, f.taxes_payable, f.installments_during_year, f.installments_after_year, f.amount_owing,
            f.due_date, f.hst_prior_balance, f.hst_payable, f.hst_installments_during, f.hst_installments_after,
            f.hst_payment_due, f.hst_due_date, f.form_data, f.created_at, f.updated_at, f.completed_at, f.rejected_at, f.rejection_reason,
            c.name as client_name, c.email as client_email,
            u1.name as created_by_name, u2.name as assigned_to_name, u3.name as amendment_sent_by_name
          FROM forms f
          LEFT JOIN clients c ON f.client_id = c.id
          LEFT JOIN users u1 ON f.created_by = u1.id
          LEFT JOIN users u2 ON f.assigned_to = u2.id
          LEFT JOIN users u3 ON f.amendment_sent_by = u3.id
          WHERE f.id = $1
        `, [formId]);
        
        if (updatedFormResult.rows.length === 0) {
          res.json({ 
            message: 'Form updated successfully',
            formId
          });
          return;
        }
        
        const updatedForm = updatedFormResult.rows[0];
        
        console.log('DEBUG: Returning updated form data:', {
          formId,
          years: updatedForm.years,
          job_number: updatedForm.job_number,
          partner: updatedForm.partner,
          manager: updatedForm.manager,
          status: updatedForm.status,
          assigned_to: updatedForm.assigned_to,
          amendment_sent_by: updatedForm.amendment_sent_by
        });
        
        res.json({ 
          message: 'Form updated successfully',
          formId,
          form: updatedForm  // Return the updated form data
        });
      } catch (selectError) {
        // If we can't fetch the updated data, still return success but without the form data
        res.json({ 
          message: 'Form updated successfully',
          formId
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating form:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ error: 'Failed to update form', details: error.message });
  }
}; 

// Update form status and handle amendment requests
exports.updateFormStatus = async (req, res) => {
  try {
    const { formId } = req.params;
    const { status, comment, amendmentNote } = req.body;
    
    // Add more detailed logging for amendment workflow
    if (status === 'pending') {
      // console.log('DEBUG: Pending status update detected - checking for amendment workflow');
    }
    
    if (!formId || !status) {
      return res.status(400).json({ error: 'Missing required fields: formId and status' });
    }
    
    const client = await pool.connect();
    
    try {
      // First, get the current form to check if it exists and get the created_by
      const formResult = await client.query(
        'SELECT created_by, assigned_to, amendment_sent_by, rejected_at FROM forms WHERE id = $1',
        [formId]
      );
      
      if (formResult.rows.length === 0) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      const form = formResult.rows[0];
      // console.log('DEBUG: Current form data:', {
      //   formId,
      //   createdBy: form.created_by,
      //   assignedTo: form.assigned_to,
      //   amendmentSentBy: form.amendment_sent_by,
      //   rejectedAt: form.rejected_at,
      //   status: status
      // });
      const now = new Date();
      
      // Prepare update query based on status
      let updateQuery;
      let updateValues;
      
      if (status === 'rejected' && amendmentNote) {
        // For amendment requests, reassign back to the original preparer and track which admin sent it
        updateQuery = `
          UPDATE forms 
          SET status = $1, 
              assigned_to = $2, 
              amendment_sent_by = $3,
              rejected_at = $4, 
              rejection_reason = $5,
              updated_at = $6
          WHERE id = $7
        `;
        updateValues = [status, form.created_by, req.user.id, now, amendmentNote, now, formId];
      } else {
        // For other status updates
        // console.log('DEBUG: Checking conditions for pending status update:');
        // console.log('DEBUG: - status === pending:', status === 'pending');
        // console.log('DEBUG: - form.amendment_sent_by:', form.amendment_sent_by);
        // console.log('DEBUG: - form.rejected_at:', form.rejected_at);
        
        if (status === 'pending' && form.amendment_sent_by) {
          // When preparer resubmits amended form, reassign back to the admin who sent the amendment
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                assigned_to = $2,
                amendment_sent_by = NULL,
                updated_at = $3
            WHERE id = $4
          `;
          updateValues = [status, form.amendment_sent_by, now, formId];
        } else if (status === 'pending' && form.rejected_at) {
          // When preparer resubmits a rejected form, reassign to an admin
          const adminId = await getDefaultAdminId(client);
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                assigned_to = $2,
                updated_at = $3
            WHERE id = $4
          `;
          updateValues = [status, adminId, now, formId];
        } else if (status === 'pending') {
          // For other pending status updates
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                updated_at = $2
            WHERE id = $3
          `;
          updateValues = [status, now, formId];
        } else if (status === 'completed') {
          // For completed status
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                completed_at = $2,
                updated_at = $3
            WHERE id = $4
          `;
          updateValues = [status, now, now, formId];
        } else if (status === 'rejected') {
          // For rejected status (without amendment note)
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                rejected_at = $2,
                rejection_reason = $3,
                updated_at = $4
            WHERE id = $5
          `;
          updateValues = [status, now, comment || 'Rejected', now, formId];
        } else {
          // For other status updates (active, etc.)
          updateQuery = `
            UPDATE forms 
            SET status = $1, 
                updated_at = $2
            WHERE id = $3
          `;
          updateValues = [status, now, formId];
        }
      }
      
      await client.query(updateQuery, updateValues);
      
      // Get the updated form with all details
      const updatedFormResult = await client.query(`
        SELECT 
          f.id, f.form_number, f.client_id, f.created_by, f.assigned_to, f.amendment_sent_by, f.status, f.form_type,
          f.file_path, f.partner, f.manager, f.years, f.job_number, f.invoice_amount, 
          f.invoice_description, f.bill_detail, f.payment_required, f.wip_recovery, f.recovery_reason,
          f.is_t1, f.is_s216, f.is_s116, f.is_paper_filed, f.installments_required,
          f.t106, f.t1134, f.ontario_annual_return, f.t_slips, f.quebec_return, f.alberta_return,
          f.t2091_principal_residence, f.t1135_foreign_property, f.t1032_pension_split,
          f.hst_draft_or_final, f.other_notes, f.other_documents,
          f.corporate_installments_required, f.fed_schedule_attached, f.hst_installment_required, f.hst_tab_completed,
          f.prior_periods_balance, f.taxes_payable, f.installments_during_year, f.installments_after_year, f.amount_owing,
          f.due_date, f.hst_prior_balance, f.hst_payable, f.hst_installments_during, f.hst_installments_after,
          f.hst_payment_due, f.hst_due_date, f.form_data, f.created_at, f.updated_at, f.completed_at, f.rejected_at, f.rejection_reason,
          c.name as client_name, c.email as client_email,
          u1.name as created_by_name, u2.name as assigned_to_name, u3.name as amendment_sent_by_name
        FROM forms f
        LEFT JOIN clients c ON f.client_id = c.id
        LEFT JOIN users u1 ON f.created_by = u1.id
        LEFT JOIN users u2 ON f.assigned_to = u2.id
        LEFT JOIN users u3 ON f.amendment_sent_by = u3.id
        WHERE f.id = $1
      `, [formId]);
      
      if (updatedFormResult.rows.length === 0) {
        return res.status(404).json({ error: 'Updated form not found' });
      }
      
      const updatedForm = updatedFormResult.rows[0];
      
      res.json({ 
        message: 'Form status updated successfully',
        form: updatedForm
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error updating form status:', error);
    res.status(500).json({ error: 'Failed to update form status', details: error.message });
  }
}; 