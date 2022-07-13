CREATE TABLE endorsement (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proposal_id BIGINT UNSIGNED,
    FOREIGN KEY(proposal_id) REFERENCES proposal(id),
    endorser INT(11) UNSIGNED,
    FOREIGN KEY(endorser) REFERENCES account(id),
    endorsed_at BIGINT UNSIGNED
)