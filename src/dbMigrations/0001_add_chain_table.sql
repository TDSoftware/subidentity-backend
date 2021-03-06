CREATE TABLE chain (
    id INT(11) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chain_name VARCHAR(255) NOT NULL,
    status ENUM('UNINDEXED', 'INPROGRESS', 'INDEXED'),
    token_symbol VARCHAR(255),
    token_decimals INT,
    is_archive_node BOOL,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)