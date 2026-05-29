-- Setup database for ARC Credit Agent
-- Run: psql -U postgres -h localhost -f scripts/setup-postgres.sql

CREATE USER arc_agent WITH PASSWORD 'arc_agent_dev';
CREATE DATABASE arc_credit_agent OWNER arc_agent;
GRANT ALL PRIVILEGES ON DATABASE arc_credit_agent TO arc_agent;
