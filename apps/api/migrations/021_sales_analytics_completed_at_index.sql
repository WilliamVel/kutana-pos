-- Analytics filters and commercial-day grouping both use completed_at.
CREATE INDEX sales_completed_at_analytics_idx ON sales (completed_at);
