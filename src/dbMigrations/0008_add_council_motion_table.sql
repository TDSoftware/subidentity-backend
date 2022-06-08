CREATE TABLE council_motion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    motionHash VARCHAR(255),
    method VARCHAR(255),
    section VARCHAR(255),
    proposedBy INT(11) UNSIGNED,
    FOREIGN KEY (proposedBy) REFERENCES account(id),
    fromBlock BIGINT UNSIGNED,
    FOREIGN KEY (fromBlock) REFERENCES block(id),
    toBlock BIGINT UNSIGNED,
    FOREIGN KEY (toBlock) REFERENCES block(id)
)