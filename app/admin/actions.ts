"use server";

import { addResourceAction, listResourcesAction, deleteResourceAction } from '@/app/actions/knowledge';

export async function addResourceFromAdmin(content: string) {
  try {
    const result = await addResourceAction(content);
    return result;
  } catch (error) {
    console.error('Error adding resource from admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listResourcesForAdmin() {
  try {
    const result = await listResourcesAction();
    return result;
  } catch (error) {
    console.error('Error listing resources for admin:', error);
    return {
      success: false,
      resources: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deleteResourceFromAdmin(id: string) {
  try {
    const result = await deleteResourceAction(id as any);
    return result;
  } catch (error) {
    console.error('Error deleting resource from admin:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}