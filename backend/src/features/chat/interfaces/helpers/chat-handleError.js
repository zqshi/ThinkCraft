export { handleError };

const handleError = (res, error) => {
  console.error('Chat API Error:', error);

  let statusCode = 500;
  let errorMessage = '服务器内部错误';

  if (error.message.includes('不存在')) {
    statusCode = 404;
    errorMessage = error.message;
  } else if (error.message.includes('无权访问')) {
    statusCode = 403;
    errorMessage = error.message;
  } else if (error.message.includes('验证失败')) {
    statusCode = 400;
    errorMessage = error.message;
  } else if (error.message.includes('不能为空')) {
    statusCode = 400;
    errorMessage = error.message;
  }

  return res.status(statusCode).json({
    code: -1,
    error: errorMessage,
    details: error.message
  });
};
