import { z } from 'zod'

export const communitySectionSchema = z.object({
  title: z.string().trim().min(1, 'Enter a section name.').max(80, 'Use 80 characters or fewer for the section name.'),
  layout: z.enum(['cards', 'list']),
})

export const communityPostSchema = z.object({
  sectionId: z.string().trim().min(1, 'Choose a section.').max(100),
  title: z.string().trim().min(1, 'Enter a post title.').max(160, 'Use 160 characters or fewer for the post title.'),
  description: z.string().trim().min(1, 'Enter the post details.').max(2000, 'Use 2,000 characters or fewer for the post details.'),
  area: z.string().trim().max(160),
  schedule: z.string().trim().max(160),
  date: z.union([z.literal(''), z.iso.date()]),
})

export const communityPostStatusSchema = z.object({ published: z.boolean() })
export type CommunitySectionInput = z.infer<typeof communitySectionSchema>
export type CommunityPostInput = z.infer<typeof communityPostSchema>
