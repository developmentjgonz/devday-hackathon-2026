/** Fictional portraits generated with ImageGen. Order matches the portrait sheet. */
export const userPortraits = [
  {
    "key": "alex-morgan",
    "name": "Alex Morgan",
    "id": "local-admin",
    "email": "admin@mews.test"
  },
  {
    "key": "sam-rivera",
    "name": "Sam Rivera",
    "id": "local-member",
    "email": "member@mews.test"
  },
  {
    "key": "jordan-lee",
    "name": "Jordan Lee",
    "id": "local-pending",
    "email": "pending@mews.test"
  },
  {
    "key": "taylor-reed",
    "name": "Taylor Reed",
    "id": "local-suspended",
    "email": "suspended@mews.test"
  },
  {
    "key": "casey",
    "name": "Casey Test",
    "email": "casey-1794088196837@mews.test"
  },
  {
    "key": "maya-rivera",
    "name": "Maya Rivera"
  },
  {
    "key": "sam-chen",
    "name": "Sam Chen"
  },
  {
    "key": "devon-james",
    "name": "Devon James"
  },
  {
    "key": "demo-administrator",
    "name": "Demo administrator",
    "id": "demo-administrator",
    "email": "demo.admin@mews.test"
  }
] as const

export function userPortraitUrl(name: string): string | undefined {
  const portrait = userPortraits.find((person) => person.name === name)
  return portrait ? `/fixtures/generated-user-portraits.svg#${portrait.key}` : undefined
}
