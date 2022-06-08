CREATE TABLE bounty (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    councilMotionId BIGINT UNSIGNED,
    FOREIGN KEY (councilMotionId) REFERENCES council_motion(id),
    bountyId INT(11),
    status VARCHAR(255),
    value INT(11),
    description VARCHAR(255),
    proposedAt BIGINT UNSIGNED,
    FOREIGN KEY (proposedAt) REFERENCES block(id),
    proposedBy INT(11) UNSIGNED,
    FOREIGN KEY (proposedBy) REFERENCES account(id)
)