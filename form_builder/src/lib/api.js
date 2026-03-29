import axios from 'axios';

// Server-side always calls localhost directly; client-side goes through Next.js proxy (/api/...)
const API_BASE_URL = typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || 'http://localhost:3001/api')
    : '/api';

/**
 * Creates an Axios instance for API calls.
 */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Get all forms (Admin perspective)
 */
export const getForms = async () => {
    try {
        const response = await apiClient.get('/forms');
        return response.data;
    } catch (error) {
        console.error('API Error: getForms', error);
        throw error;
    }
};

/**
 * Get a single form by its ID or UUID.
 * Includes sections, questions, and options.
 */
export const getFormById = async (idOrUuid) => {
    try {
        const response = await apiClient.get(`/forms/${idOrUuid}`);
        return response.data;
    } catch (error) {
        console.error(`API Error: getFormById(${idOrUuid})`, error);
        throw error;
    }
};

/**
 * Get form analytics.
 */
export const getFormAnalytics = async (idOrUuid) => {
    try {
        const response = await apiClient.get(`/forms/${idOrUuid}/analytics`);
        return response.data;
    } catch (error) {
        console.error(`API Error: getFormAnalytics(${idOrUuid})`, error);
        throw error;
    }
};

/**
 * Export form responses.
 */
export const exportFormResponses = async (idOrUuid) => {
    try {
        const response = await apiClient.get(`/forms/${idOrUuid}/export`);
        return response.data;
    } catch (error) {
        console.error(`API Error: exportFormResponses(${idOrUuid})`, error);
        throw error;
    }
};

/**
 * Submit a response for a form.
 */
export const submitFormResponse = async (idOrUuid, payload) => {
    try {
        const response = await apiClient.post(`/forms/${idOrUuid}/responses`, payload);
        return response.data;
    } catch (error) {
        console.error(`API Error: submitFormResponse(${idOrUuid})`, error);
        throw error;
    }
};

/**
 * Fetch Form Topics.
 */
export const getFormTopics = async () => {
    try {
        const response = await apiClient.get('/form-topics');
        return response.data;
    } catch (error) {
        console.error('API Error: getFormTopics', error);
        throw error;
    }
};

/**
 * Fetch Master Option Sets.
 */
export const getOptionSets = async () => {
    try {
        const response = await apiClient.get('/option-sets');
        return response.data;
    } catch (error) {
        console.error('API Error: getOptionSets', error);
        throw error;
    }
};

// --- Add other centralized endpoints here as needed ---
