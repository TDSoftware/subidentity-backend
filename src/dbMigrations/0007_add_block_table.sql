CREATE TABLE block (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chain_id INT(11) UNSIGNED NOT NULL,
    FOREIGN KEY(chain_id) REFERENCES chain(id),
    hash VARCHAR(255),
    number INT,
    CONSTRAINT number_chain UNIQUE (number,chain_id),
    error Boolean,
    error_message VARCHAR(255)
)