CREATE TABLE bounty (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    council_motion_id BIGINT UNSIGNED,
    FOREIGN KEY (council_motion_id) REFERENCES council_motion(id),
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id),
    bounty_id INT(11),
    status VARCHAR(255),
    value BIGINT,
    description VARCHAR(255),
    proposed_at BIGINT UNSIGNED,
    FOREIGN KEY (proposed_at) REFERENCES block(id),
    proposed_by INT(11) UNSIGNED,
    FOREIGN KEY (proposed_by) REFERENCES account(id),
    modified_at BIGINT UNSIGNED,
    FOREIGN KEY (modified_at) REFERENCES block(id)
)