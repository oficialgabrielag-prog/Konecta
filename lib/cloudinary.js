
const CLOUD_NAME = 'veajfhm1';
const UPLOAD_PRESET = 'konecta_angola';

export async function uploadImage(imageUri, folder = 'ideas') {
  if (!imageUri) {
    throw new Error('Seleciona uma imagem primeiro.');
  }

  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    name: 'konecta-image.jpg',
    type: 'image/jpeg',
  });

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `konecta/${folder}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok || !result.secure_url) {
    throw new Error(
      result.error?.message || 'Falha ao enviar a imagem.'
    );
  }

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
