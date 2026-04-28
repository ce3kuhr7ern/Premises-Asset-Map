export const Permission = {
  ViewDocument:        'document:view',
  UploadDocument:      'document:upload',
  DeleteDocument:      'document:delete',
  ViewAsset:           'asset:view',
  EditAsset:           'asset:edit',
  DeleteAsset:         'asset:delete',
  ViewCompliance:      'compliance:view',
  ManageCompliance:    'compliance:manage',
  ApproveCompliance:   'compliance:approve',
  UploadCertificate:   'certificate:upload',
  ManageUsers:         'users:manage',
  ViewAuditLog:        'auditlog:view',
  ManageAssetTypes:    'asset-types:manage',
  ViewContractors:     'contractors:view',
  ManageContractors:   'contractors:manage',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

export type AppRole = 'trust_admin' | 'trustee' | 'club_manager' | 'club_user' | 'contractor' | 'auditor';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  trust_admin: Object.values(Permission),
  trustee: [
    Permission.ViewDocument, Permission.UploadDocument,
    Permission.ViewAsset,
    Permission.ViewCompliance, Permission.ManageCompliance, Permission.ApproveCompliance,
    Permission.ViewContractors, Permission.ManageContractors,
    Permission.ViewAuditLog,
  ],
  club_manager: [
    Permission.ViewDocument, Permission.UploadDocument, Permission.DeleteDocument,
    Permission.ViewAsset, Permission.EditAsset,
    Permission.ViewCompliance, Permission.ManageCompliance,
    Permission.ViewContractors, Permission.ManageContractors,
    Permission.UploadCertificate,
    Permission.ManageUsers,
  ],
  club_user: [
    Permission.ViewDocument, Permission.UploadDocument,
    Permission.ViewAsset, Permission.EditAsset,
    Permission.ViewCompliance,
    Permission.ViewContractors,
    Permission.UploadCertificate,
  ],
  contractor: [
    Permission.UploadCertificate,
    Permission.ViewDocument,
  ],
  auditor: [
    Permission.ViewDocument, Permission.ViewAsset,
    Permission.ViewCompliance, Permission.ViewContractors, Permission.ViewAuditLog,
  ],
};
