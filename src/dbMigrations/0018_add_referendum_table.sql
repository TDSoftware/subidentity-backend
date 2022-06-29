CREATE TABLE referendum (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proposal_id BIGINT UNSIGNED,
    FOREIGN KEY(proposal_id) REFERENCES proposal(id),
    started_at BIGINT UNSIGNED,
    FOREIGN KEY(started_at) REFERENCES block(id),
    ended_at BIGINT UNSIGNED,
    FOREIGN KEY(ended_at) REFERENCES block(id),
    status VARCHAR(255),
    vote_threshold VARCHAR(255)
)