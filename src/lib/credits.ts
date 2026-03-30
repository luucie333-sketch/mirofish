export const CREDIT_PACKAGES = [
  { id: 'starter', credits: 10, price: 2.99, label: 'Starter' },
  { id: 'pro', credits: 50, price: 9.99, label: 'Pro', popular: true },
  { id: 'power', credits: 150, price: 19.99, label: 'Power User' },
] as const;

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]['id'];

export function getPackage(id: string) {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
