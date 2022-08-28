CREATE TABLE council_motion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motion_hash VARCHAR(255),
    proposal_index INT(11),
    chain_id INT(11) UNSIGNED,
    FOREIGN KEY (chain_id) REFERENCES chain(id),
    method VARCHAR(255),
    section VARCHAR(255),
    status VARCHAR(255),
    proposed_by INT(11) UNSIGNED,
    FOREIGN KEY (proposed_by) REFERENCES account(id),
    from_block BIGINT UNSIGNED,
    FOREIGN KEY (from_block) REFERENCES block(id),
    to_block BIGINT UNSIGNED,
    FOREIGN KEY (to_block) REFERENCES block(id),
    modified_at BIGINT UNSIGNED,
    FOREIGN KEY (modified_at) REFERENCES block(id)
)