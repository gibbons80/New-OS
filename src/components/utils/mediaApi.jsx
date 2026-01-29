// AWS API Gateway endpoint for media operations
const API_BASE = 'https://qf1zeph3zk.execute-api.us-east-2.amazonaws.com/prod';

/**
 * Uploads a file to S3 using pre-signed URL
 * @param {File} file - The file to upload
 * @returns {Promise<{fileKey: string}>} - The S3 key of the uploaded file
 */
export async function uploadFile(file) {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileKey = `${timestamp}-${randomString}.${fileExtension}`;
    
    // Step 1: Get pre-signed upload URL from API
    const uploadUrlResponse = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: fileKey,
        contentType: file.type
      })
    });

    if (!uploadUrlResponse.ok) {
      const error = await uploadUrlResponse.text();
      throw new Error(`Failed to get upload URL: ${error}`);
    }

    const { uploadUrl } = await uploadUrlResponse.json();

    if (!uploadUrl) {
      throw new Error('No upload URL received from server');
    }

    // Step 2: Upload file directly to S3 using pre-signed URL
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
    }

    return { fileKey };
    } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message || JSON.stringify(error)}`);
    }
    }

/**
 * Uploads a file with progress tracking
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Callback for progress updates (percent, loaded, total)
 * @returns {Promise<{fileKey: string}>} - The S3 key of the uploaded file
 */
export async function uploadFileWithProgress(file, onProgress) {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileKey = `${timestamp}-${randomString}.${fileExtension}`;
    
    // Step 1: Get pre-signed upload URL from API
    const uploadUrlResponse = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: fileKey,
        contentType: file.type
      })
    });

    if (!uploadUrlResponse.ok) {
      const error = await uploadUrlResponse.text();
      throw new Error(`Failed to get upload URL: ${error}`);
    }

    const { uploadUrl } = await uploadUrlResponse.json();

    if (!uploadUrl) {
      throw new Error('No upload URL received from server');
    }

    // Step 2: Upload file with progress tracking using XMLHttpRequest
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete, e.loaded, e.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ fileKey });
        } else {
          reject(new Error(`Failed to upload file to S3: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
    } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message || JSON.stringify(error)}`);
    }
    }

/**
 * Gets a download URL for a file
 * @param {string} fileKey - The S3 key of the file
 * @returns {Promise<{downloadUrl: string}>} - Pre-signed download URL
 */
export async function getDownloadUrl(fileKey) {
  try {
    console.log('Requesting download URL for key:', fileKey);
    const url = `${API_BASE}/media/download?key=${encodeURIComponent(fileKey)}`;
    console.log('Download endpoint URL:', url);
    
    const response = await fetch(url);
    
    console.log('Download response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download API error response:', errorText);
      throw new Error(`Failed to get download URL (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('Download URL response:', data);

    if (!data.downloadUrl) {
      throw new Error('No download URL received from server');
    }

    return { downloadUrl: data.downloadUrl };
  } catch (error) {
    console.error('Download URL error:', error);
    throw new Error(`Download failed: ${error.message || JSON.stringify(error)}`);
  }
}