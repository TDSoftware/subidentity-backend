CREATE TABLE tip_proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motion_hash VARCHAR(255),
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id),
    beneficiary INT(11) UNSIGNED,
    FOREIGN KEY(beneficiary) REFERENCES account(id),
    finder INT(11) UNSIGNED,
    FOREIGN KEY(finder) REFERENCES account(id),
    reason TEXT,
    status VARCHAR(255),
    value FLOAT(12),
    proposed_at BIGINT UNSIGNED,
    FOREIGN KEY(proposed_at) REFERENCES block(id),
    modified_at BIGINT UNSIGNED,
    FOREIGN KEY (modified_at) REFERENCES block(id)
)
    
