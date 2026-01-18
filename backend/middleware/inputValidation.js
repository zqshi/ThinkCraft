import Joi from 'joi';

export const validateAgentHire = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    agentType: Joi.string().required(),
    nickname: Joi.string().min(1).max(50).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      code: -1,
      error: `参数校验失败: ${error.details[0].message}`
    });
  }
  return next();
};

export const validateConversationCreate = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().min(1).max(255).required(),
    userData: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      code: -1,
      error: `参数校验失败: ${error.details[0].message}`
    });
  }
  return next();
};

export const validateReportGenerate = (req, res, next) => {
  const schema = Joi.object({
    conversationId: Joi.string().required(),
    userId: Joi.string().required(),
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().required()
      })
    ).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      code: -1,
      error: `参数校验失败: ${error.details[0].message}`
    });
  }
  return next();
};

export const validateShareCreate = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    type: Joi.string().valid('report', 'business_plan', 'demo', 'other').required(),
    data: Joi.object().required(),
    title: Joi.string().max(255).optional(),
    options: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      code: -1,
      error: `参数校验失败: ${error.details[0].message}`
    });
  }
  return next();
};
