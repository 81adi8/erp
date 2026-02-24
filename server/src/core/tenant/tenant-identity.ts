export type TenantIdentity = Readonly<{
    id: string;
    db_schema: string;
    slug: string;
    status: 'active' | 'trial' | 'suspended';
    plan_id?: string;
}>;

export const freezeTenantIdentity = (tenant: {
    id: string;
    db_schema: string;
    slug: string;
    status: 'active' | 'trial' | 'suspended';
    plan_id?: string;
}): TenantIdentity => Object.freeze({
    id: tenant.id,
    db_schema: tenant.db_schema,
    slug: tenant.slug,
    status: tenant.status,
    plan_id: tenant.plan_id,
});
