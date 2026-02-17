/**
 * Data Transfer Objects for Reports Module
 * Defines the structure of data exchanged between layers
 */

/**
 * Date range query parameters
 * @typedef {Object} DateRangeQuery
 * @property {string} startDate - Start date in YYYY-MM-DD format
 * @property {string} endDate - End date in YYYY-MM-DD format
 */

/**
 * Total revenue response
 * @typedef {Object} TotalRevenueResponse
 * @property {Object} data
 * @property {number} data.totalRevenue - Total revenue for the period
 * @property {string} data.startDate - Start date
 * @property {string} data.endDate - End date
 * @property {boolean} success - Operation success status
 */

/**
 * Daily revenue data point
 * @typedef {Object} DailyRevenuePoint
 * @property {string} business_date - Date in YYYY-MM-DD format
 * @property {number} total_revenue - Total revenue for that day
 */

/**
 * Daily revenue response
 * @typedef {Object} DailyRevenueResponse
 * @property {DailyRevenuePoint[]} data - Array of daily revenue points
 * @property {boolean} success - Operation success status
 * @property {Object} meta
 * @property {string} meta.startDate - Start date
 * @property {string} meta.endDate - End date
 * @property {number} meta.count - Number of data points
 */

/**
 * Payment type summary point
 * @typedef {Object} PaymentTypeSummaryPoint
 * @property {string} payment_type - Payment type (cash, mpesa, etc.)
 * @property {number} total_amount - Total amount for this payment type
 * @property {number} count - Number of transactions
 */

/**
 * Payment type summary response
 * @typedef {Object} PaymentTypeSummaryResponse
 * @property {PaymentTypeSummaryPoint[]} data - Array of payment type summaries
 * @property {boolean} success - Operation success status
 * @property {Object} meta
 * @property {string} meta.startDate - Start date
 * @property {string} meta.endDate - End date
 * @property {number} meta.count - Number of payment types
 */

/**
 * Average bill value response
 * @typedef {Object} AverageBillValueResponse
 * @property {Object} data
 * @property {number} data.averageBillValue - Average bill value
 * @property {string} data.startDate - Start date
 * @property {string} data.endDate - End date
 * @property {boolean} success - Operation success status
 */

/**
 * Outstanding bill
 * @typedef {Object} OutstandingBill
 * @property {string} bill_id - Bill ID
 * @property {number} bill_total - Total bill amount
 * @property {number} paid_amount - Amount paid
 * @property {number} outstanding_amount - Outstanding amount
 * @property {string} customer_name - Customer name
 * @property {string} served_by - Server name
 * @property {string} created_at - Bill creation timestamp
 */

/**
 * Outstanding bills response
 * @typedef {Object} OutstandingBillsResponse
 * @property {OutstandingBill[]} data - Array of outstanding bills
 * @property {boolean} success - Operation success status
 * @property {Object} meta
 * @property {string} meta.startDate - Start date
 * @property {string} meta.endDate - End date
 * @property {number} meta.count - Number of outstanding bills
 */

/**
 * Category sales point
 * @typedef {Object} CategorySalesPoint
 * @property {string} category_id - Category ID
 * @property {string} category_name - Category name
 * @property {number} total_quantity - Total quantity sold
 * @property {number} total_sales - Total sales amount
 */

/**
 * Category sales response
 * @typedef {Object} CategorySalesResponse
 * @property {CategorySalesPoint[]} data - Array of category sales
 * @property {boolean} success - Operation success status
 * @property {Object} meta
 * @property {string} meta.startDate - Start date
 * @property {string} meta.endDate - End date
 * @property {number} meta.count - Number of categories
 */

/**
 * Dashboard metrics (all metrics in one response)
 * @typedef {Object} DashboardMetrics
 * @property {number} totalRevenue - Total revenue
 * @property {DailyRevenuePoint[]} dailyRevenue - Daily revenue breakdown
 * @property {PaymentTypeSummaryPoint[]} paymentTypes - Payment types summary
 * @property {number} averageBillValue - Average bill value
 * @property {OutstandingBill[]} outstandingBills - Outstanding bills
 * @property {CategorySalesPoint[]} categorySales - Category sales
 */

/**
 * Dashboard metrics response
 * @typedef {Object} DashboardMetricsResponse
 * @property {DashboardMetrics} data - All dashboard metrics
 * @property {boolean} success - Operation success status
 * @property {Object} meta
 * @property {string} meta.startDate - Start date
 * @property {string} meta.endDate - End date
 */

module.exports = {
  // Export type definitions for use in other modules
  // These are primarily for documentation via JSDoc
};
