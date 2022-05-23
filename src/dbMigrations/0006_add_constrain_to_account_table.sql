ALTER TABLE account
ADD CONSTRAINT address_chain UNIQUE (address,chain_id);