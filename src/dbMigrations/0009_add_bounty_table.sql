CREATE TABLE bounty (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(255),
    value INT(11),
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    proposer INT(11) UNSIGNED,
    FOREIGN KEY (proposer) REFERENCES account(id),
    curator INT(11) UNSIGNED,
    FOREIGN KEY (curator) REFERENCES account(id)
)