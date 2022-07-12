CREATE TABLE tip (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipper INT(11) UNSIGNED,
    FOREIGN KEY(tipper) REFERENCES account(id),
    value BIGINT(64),
    tip_proposal_id BIGINT UNSIGNED,
    FOREIGN KEY(tip_proposal_id) REFERENCES tip_proposal(id),
    tipped_at BIGINT UNSIGNED,
    FOREIGN KEY(tipped_at) REFERENCES block(id)
)