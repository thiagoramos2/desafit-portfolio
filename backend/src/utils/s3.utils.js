const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// Upload de arquivos para o S3
async function uploadToS3(buffer, key, contentType) {
  try {
    const bucketName = process.env.S3_BUCKET || 'dietbet';
    
    console.log(`Tentando fazer upload para S3: bucket=${bucketName}, key=${key}`);
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read' // Para tornar o arquivo publicamente acessível
    });
    
    const response = await global.s3Client.send(command);
    
    console.log('Upload S3 bem-sucedido:', response);
    
    // Gera a URL pública
    const publicUrl = getS3PublicUrl(key);
    
    return {
      success: true,
      publicUrl
    };
  } catch (error) {
    console.error('Erro no upload para S3:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Obter URL pública de objetos no S3
function getS3PublicUrl(key) {
  const bucketName = process.env.S3_BUCKET || 'dietbet';
  const endpoint = process.env.S3_ENDPOINT;
  
  // Remover a parte /storage/v1/s3 do endpoint e construir a URL pública
  const baseUrl = endpoint.replace('/storage/v1/s3', '');
  const publicUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${key}`;
  
  return publicUrl;
}

module.exports = {
  uploadToS3,
  getS3PublicUrl
}; 