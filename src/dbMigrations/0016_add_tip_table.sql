CREATE TABLE tip (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tipper INT(11) UNSIGNED,
    FOREIGN KEY(tipper) REFERENCES account(id),
    value INT(11),
    tip_proposal_id BIGINT,
    tipped_at BIGINT UNSIGNED,
    FOREIGN KEY(tipped_at) REFERENCES block(id)
)