CREATE table log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    timestamp VARCHAR(255),
    event VARCHAR(255),
    ip VARCHAR(255),
    info TEXT
)