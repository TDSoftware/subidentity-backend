ALTER TABLE councilor
ADD CONSTRAINT councilterm_id_account_id UNIQUE (councilterm_id, account_id);