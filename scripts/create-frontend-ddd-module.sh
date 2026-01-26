#!/bin/bash

# Script to create frontend DDD module structure

MODULE_NAME=$1
MODULE_PATH="/Users/zqs/Downloads/project/ThinkCraft/frontend/src/features/${MODULE_NAME}"

if [ -z "$MODULE_NAME" ]; then
    echo "Usage: $0 <module-name>"
    exit 1
fi

echo "Creating frontend DDD module: ${MODULE_NAME}"

# Create directory structure
mkdir -p "${MODULE_PATH}/domain/{value-objects,entities,events}"
mkdir -p "${MODULE_PATH}/application"
mkdir -p "${MODULE_PATH}/infrastructure"
mkdir -p "${MODULE_PATH}/presentation"

# Create basic index.js
cat > "${MODULE_PATH}/index.js" << 'EOF'
// Domain exports
// export { ModuleAggregate } from './domain/module.aggregate.js';

// Application exports
// export { ModuleUseCase } from './application/module.use-case.js';

// Infrastructure exports
// export { ModuleRepository } from './infrastructure/module.repository.js';
// export { ModuleMapper } from './infrastructure/module.mapper.js';

// Presentation exports
// export { ModuleComponent } from './presentation/module-component.jsx';
EOF

echo "Created module structure at: ${MODULE_PATH}"
echo "Remember to:"
echo "1. Create the domain model based on backend implementation"
echo "2. Implement the application use cases"
echo "3. Create infrastructure layer (repository, mapper)"
echo "4. Build presentation components"
echo "5. Update the index.js exports"""}
chmod +x /Users/zqs/Downloads/project/ThinkCraft/scripts/create-frontend-ddd-module.sh