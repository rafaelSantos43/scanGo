import { sql } from 'drizzle-orm'
import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  timezone: text('timezone').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    userId: uuid('user_id'),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('customers_business_email_unique').on(
      table.businessId,
      table.email,
    ),
  ],
)

export const packages = pgTable(
  'packages',
  {
    id: uuid('id').primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    totalVisits: integer('total_visits').notNull(),
    remainingVisits: integer('remaining_visits').notNull(),
    status: text('status').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('one_active_package_per_customer')
      .on(table.customerId)
      .where(sql`${table.status} = 'active'`),
  ],
)

// Sede física de un negocio. `business` es la empresa (tenant); `location`
// es la sucursal. Declarada antes de qr_tokens/attendances porque ambas la
// referencian.
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const qrTokens = pgTable('qr_tokens', {
  token: uuid('token').primaryKey(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  locationId: uuid('location_id')
    .notNull()
    .references(() => locations.id),
  generatedAt: timestamp('generated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '24 hours'`),
  usedBy: uuid('used_by').references(() => customers.id),
  usedAt: timestamp('used_at', { withTimezone: true }),
})

export const attendances = pgTable(
  'attendances',
  {
    id: uuid('id').primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id),
    packageId: uuid('package_id')
      .notNull()
      .references(() => packages.id),
    qrToken: uuid('qr_token')
      .notNull()
      .references(() => qrTokens.token),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(),
    scannedDate: date('scanned_date').notNull(),
  },
  (table) => [
    uniqueIndex('attendances_no_double_scan_per_day').on(
      table.customerId,
      table.businessId,
      table.scannedDate,
    ),
  ],
)

export const businessAdmins = pgTable(
  'business_admins',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.userId] })],
)
