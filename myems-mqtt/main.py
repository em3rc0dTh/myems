import logging
from logging.handlers import RotatingFileHandler
from multiprocessing import Process
import gateway
import time

def main():
    logger = logging.getLogger('myems-mqtt')
    logger.setLevel(logging.INFO)
    fh = RotatingFileHandler('myems-mqtt.log', maxBytes=1024*1024, backupCount=1)
    fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(fh)
    logger.addHandler(logging.StreamHandler())

    print("[MyEMS MQTT] Starting gateway...")
    Process(target=gateway.process, args=(logger,)).start()

    while True:
        time.sleep(3600)

if __name__ == "__main__":
    main()
