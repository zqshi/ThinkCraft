import express from 'express';
import promptLoader from '../../../utils/prompt-loader.js';
import { body, param, query } from 'express-validator';
import { ChatUseCase } from '../application/chat.use-case.js';
import { AddMessageDTO, CreateChatDTO, UpdateChatDTO } from '../application/chat.dto.js';
import { handleError } from './helpers/chat-handleError.js';
import { normalizeAutoTitle } from './helpers/chat-normalizeAutoTitle.js';
import { validateRequest } from './helpers/chat-validateRequest.js';
import { buildTitlePrompt } from './helpers/chat-buildTitlePrompt.js';
import { registerChatCrudRoutes } from './routes/chat-crud-routes.js';
import { registerChatTitleRoutes } from './routes/chat-title-routes.js';
import { registerChatLegacyRoutes } from './routes/chat-legacy-routes.js';

const router = express.Router();
const chatUseCase = new ChatUseCase();

registerChatCrudRoutes(router, {
  body,
  param,
  query,
  validateRequest,
  handleError,
  chatUseCase,
  CreateChatDTO,
  AddMessageDTO,
  UpdateChatDTO
});

registerChatTitleRoutes(router, {
  body,
  param,
  validateRequest,
  handleError,
  chatUseCase,
  UpdateChatDTO,
  buildTitlePrompt,
  normalizeAutoTitle
});

registerChatLegacyRoutes(router, {
  promptLoader,
  handleError
});

export default router;
