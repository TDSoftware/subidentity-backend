CREATE TABLE treasury_proposal (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id),
    proposal_id INT(11),
    proposed_at BIGINT UNSIGNED,
    FOREIGN KEY (proposed_at) REFERENCES block(id),
    value BIGINT,
    status VARCHAR(255),
    proposed_by INT(11) UNSIGNED,
    FOREIGN KEY (proposed_by) REFERENCES account(id),
    beneficiary INT(11) UNSIGNED,
    FOREIGN KEY (beneficiary) REFERENCES account(id),
    modified_at BIGINT UNSIGNED,
    FOREIGN KEY (modified_at) REFERENCES block(id)
)