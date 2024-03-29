CREATE table proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proposal_index INT(11),
    proposed_by INT(11) UNSIGNED,
    FOREIGN KEY(proposed_by) REFERENCES account(id),
    proposed_at BIGINT UNSIGNED,
    FOREIGN KEY(proposed_at) REFERENCES block(id),
    motion_hash VARCHAR(255),
    status VARCHAR(255),
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id),
    type VARCHAR(255),
    modified_at BIGINT UNSIGNED,
    FOREIGN KEY (modified_at) REFERENCES block(id)
)
