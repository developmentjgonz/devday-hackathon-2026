/** Describe a known or estimated birth date in years and months. */
export function catAge(date: string, estimated: boolean) {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return ''
  const today = new Date()
  const months = Math.max(0, (today.getFullYear() - year) * 12 + today.getMonth() + 1 - month - (today.getDate() < day ? 1 : 0))
  const years = Math.floor(months / 12)
  const remainder = months % 12
  const parts = [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', remainder || !years ? `${remainder} ${remainder === 1 ? 'month' : 'months'}` : ''].filter(Boolean)
  return `${estimated ? 'About ' : ''}${parts.join(', ')}`
}
