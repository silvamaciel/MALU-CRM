// backend/utils/validationHelpers.js
const mongoose = require('mongoose');

/**
 * Validates if provided IDs are valid MongoDB ObjectIds.
 * Throws an error if any ID is invalid.
 * @param {object} ids - An object where keys are descriptive names and values are the IDs to validate.
 *                       Example: { userId: 'someId', companyId: 'anotherId' }
 */
function validateObjectIds(ids) {
  for (const key in ids) {
    if (!ids[key] || !mongoose.Types.ObjectId.isValid(ids[key])) {
      // Providing a more generic error as specific ID value might be sensitive in some contexts
      throw new Error(`ID inválido fornecido para o campo: ${key}.`);
    }
  }
}

/**
 * Fetches a document by ID, ensuring it belongs to the specified company.
 * Throws an error if not found or does not belong to the company.
 * @param {mongoose.Model} Model - The Mongoose model to query.
 * @param {string} docId - The ID of the document to find.
 * @param {string} companyId - The ID of the company the document must belong to.
 * @param {string} [docName='Documento'] - Name of the document type for error messages.
 * @param {object} [session=null] - Optional Mongoose session for transactional operations.
 * @param {string} [select=''] - Optional fields to select.
 * @param {Array<object|string>} [populatePaths=[]] - Optional paths to populate.
 * @param {boolean} [lean=false] - Whether to apply .lean() to the query.
 * @returns {Promise<mongoose.Document|object>} The found document or plain object if lean is true.
 */
async function findAndValidateOwnership(Model, docId, companyId, docName = 'Documento', session = null, select = '', populatePaths = [], lean = false) {
  validateObjectIds({ [`${docName}_Id`]: docId, companyId });

  let query = Model.findOne({ _id: docId, company: companyId });

  if (session) {
    query = query.session(session);
  }
  if (select) {
    query = query.select(select);
  }
  if (populatePaths.length > 0) {
    populatePaths.forEach(p => {
      if (typeof p === 'string') {
        query = query.populate(p);
      } else if (typeof p === 'object') {
        query = query.populate(p);
      }
    });
  }
  if (lean) {
    query = query.lean();
  }

  const document = await query; // exec() is optional here as await works on query directly

  if (!document) {
    throw new Error(`${docName} com ID ${docId} não encontrado ou não pertence à empresa.`);
  }
  return document;
}

/**
 * Checks for duplicate field value within a company, excluding a specific document ID (for updates).
 * Throws an error if a duplicate is found.
 * @param {mongoose.Model} Model - The Mongoose model.
 * @param {object} queryFields - The fields to check for duplicates, excluding companyId (e.g., { nome: 'Test Name' }).
 * @param {string} companyId - The ID of the company.
 * @param {string} [excludeId=null] - An ID to exclude from the duplicate check (for updates).
 * @param {string} [docName='Documento'] - Name of the document type for error messages.
 */
async function checkDuplicateField(Model, queryFields, companyId, excludeId = null, docName = 'Documento') {
  validateObjectIds({ companyId });

  const checkQuery = { ...queryFields, company: companyId };
  if (excludeId) {
    validateObjectIds({ excludeId });
    checkQuery._id = { $ne: excludeId };
  }

  const fieldName = Object.keys(queryFields)[0]; // Get the first field name for the error message
  const fieldValue = queryFields[fieldName];

  const existing = await Model.findOne(checkQuery).lean(); // .lean() for performance, no need for full Mongoose doc
  if (existing) {
    throw new Error(`${docName} com ${fieldName} '${fieldValue}' já existe nesta empresa.`);
  }
}

module.exports = {
    validateObjectIds,
    findAndValidateOwnership,
    checkDuplicateField,
};
