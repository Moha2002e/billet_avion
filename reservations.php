<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réservations</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<h1>Réservations</h1>
<header>
    <?php include "inc/nav.php"?>
</header>
<div class="container">

    <table>
        <thead>
        <tr>
            <th>Client</th>
            <th>Vol</th>
            <th>Date reservations</th>
        </tr>
        </thead>
        <tbody>
        <?php
        $servername = "localhost";
        $username = "root";
        $password = "";
        $dbname = "billet";

        $conn = new mysqli($servername, $username, $password, $dbname);

        if ($conn->connect_error) {
            die("Connection failed: " . $conn->connect_error);
        }

        $sql = "SELECT clients.nom, clients.prenom, vols.compagnie, vols.origine, vols.destination ,reservations.date_r FROM reservations 
                    INNER JOIN clients ON reservations.client_id = clients.id 
                    INNER JOIN vols ON reservations.vol_id = vols.id";
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                echo "<tr><td>".$row["nom"]." ".$row["prenom"]."</td><td>".$row["compagnie"].": ".$row["origine"]." - ".$row["destination"]."</td><td>".$row["date_r"]."</td></tr>";
            }
        } else {
            echo "<tr><td colspan='3'>Aucune réservation trouvée.</td></tr>";
        }
        $conn->close();
        ?>
        </tbody>
    </table>
</div>
</body>
</html>
