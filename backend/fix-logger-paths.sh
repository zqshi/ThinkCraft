#!/bin/bash

# 修复所有logger导入路径
# logger.js的实际位置: backend/middleware/logger.js

# src/features/*/*/*.js -> ../../../middleware/logger.js
find src/features -maxdepth 3 -name "*.js" -type f -exec sed -i '' "s|from '../../../../middleware/logger.js'|from '../../../middleware/logger.js'|g" {} \;

# src/features/*/*/*/*.js -> ../../../../middleware/logger.js  
find src/features -maxdepth 4 -name "*.js" -type f -exec sed -i '' "s|from '../../../../../middleware/logger.js'|from '../../../../middleware/logger.js'|g" {} \;

# src/features/*/*/*/*/*.js -> ../../../../../middleware/logger.js
find src/features -maxdepth 5 -name "*.js" -type f -exec sed -i '' "s|from '../../../../../../middleware/logger.js'|from '../../../../../middleware/logger.js'|g" {} \;

echo "Logger paths fixed"
