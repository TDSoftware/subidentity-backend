ALTER TABLE judgement ADD CONSTRAINT chain_id FOREIGN KEY (chain_id) REFERENCES chain(id);