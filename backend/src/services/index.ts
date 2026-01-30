// ============================================================================
// Service Layer Index
// Re-exports all service modules for clean imports
// ============================================================================

export { productService, ProductService } from './product.service.js';
export type { 
    CreateProductInput, 
    UpdateProductInput, 
    ProductQueryOptions 
} from './product.service.js';

export { ecoService, ECOService } from './eco.service.js';
export type { 
    CreateECOInput, 
    UpdateECOInput, 
    ECOQueryOptions 
} from './eco.service.js';

export { bomService, BOMService } from './bom.service.js';
export type { 
    CreateBOMInput, 
    UpdateBOMInput, 
    BOMQueryOptions,
    BOMComponentInput,
    BOMOperationInput 
} from './bom.service.js';

export { workOrderService, WorkOrderService } from './workorder.service.js';
export type { 
    CreateWorkOrderInput, 
    UpdateWorkOrderInput, 
    WorkOrderQueryOptions 
} from './workorder.service.js';

export { supplierService, SupplierService } from './supplier.service.js';
export type { 
    CreateSupplierInput, 
    UpdateSupplierInput, 
    SupplierQueryOptions,
    CreateDefectInput 
} from './supplier.service.js';

export { aiService, AIService } from './ai.service.js';
export type { 
    ECORiskInput, 
    RiskAnalysisResult, 
    ChatMessage 
} from './ai.service.js';

export { authService, userService, AuthService, UserService } from './auth.service.js';
export type { 
    RegisterInput, 
    LoginInput, 
    UpdateUserInput, 
    ChangePasswordInput 
} from './auth.service.js';
