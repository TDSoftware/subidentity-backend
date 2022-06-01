CREATE TABLE council_motion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    proposalId BIGINT UNSIGNED NOT NULL,
    FOREIGN KEY(proposalId) REFERENCES motion_proposal(id),
    fromBlock INT(11) NOT NULL,
    FOREIGN KEY (fromBlock) REFERENCES block(number),
    toBlock INT(11) NOT NULL,
    FOREIGN KEY (toBlock) REFERENCES block(number)
)