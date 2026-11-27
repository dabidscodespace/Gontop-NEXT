// src/api/gameInputs.js

import { CONFIG } from './config';

/**
 * Fetch product extra fields from ThemeComplete EPO
 */
export async function getProductGameInputs(productId) {
  if (!productId) {
    throw new Error('Product ID is required');
  }

  const response = await fetch(
    `${CONFIG.BASE_URL}/api/v1/product-fields/${productId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  return {
    fields: data.fields || [],
    sectionTitle: data.section_title || '',
    productId: data.product_id,
    count: data.count || 0,
    source: data.source || '',
  };
}

/**
 * Validate game account
 */
export async function validateGameAccount(productId, userId, zoneId = '') {
  if (!productId || !userId) {
    throw new Error('Product ID and User ID are required');
  }

  const params = new URLSearchParams({ user_id: userId });
  if (zoneId) {
    params.append('zone_id', zoneId);
  }

  const response = await fetch(
    `${CONFIG.BASE_URL}/api/v1/validate-game/${productId}?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Check if product has validation
 */
export async function checkHasValidation(productId) {
  const response = await fetch(
    `${CONFIG.BASE_URL}/api/v1/has-validation/${productId}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    return { has_validation: false };
  }

  return response.json();
}