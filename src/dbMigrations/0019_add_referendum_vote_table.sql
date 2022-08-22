CREATE TABLE referendum_vote (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    referendum_id BIGINT UNSIGNED,
    FOREIGN KEY(referendum_id) REFERENCES referendum(id),
    voter INT(11) UNSIGNED,
    FOREIGN KEY(voter) REFERENCES account(id),
    voted_at BIGINT UNSIGNED,
    FOREIGN KEY(voted_at) REFERENCES block(id),
    locked_value BIGINT,
    conviction FLOAT(2),
    vote Boolean
)