CREATE TABLE account (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chain_id INT(11) UNSIGNED NOT NULL,
    FOREIGN KEY(chain_id) REFERENCES chain(id),
    address VARCHAR(255),
    balance DECIMAL(22,12)
)